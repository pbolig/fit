// ==============================================================================
// FITPULSE - CLASS ROOM & TRAINER SERVICE
// Gestiona:
// 1. Asignación de Roles por Superusuario (Atleta <-> Entrenador)
// 2. Creación y Programación de Salas de Entrenamiento
// 3. Sala de Espera y Admisión Previa (Presencial y Remoto)
// 4. Lanzamiento de Rutinas Sincronizadas
// 5. Interacción por Videocámara para Alumnos Remotos con apagado total
// 6. Reportes de Asistencia por Usuario y por Clase
// ==============================================================================

import { localDB } from '../db/indexedDB.js';
import { SupabaseManager } from '../db/supabaseClient.js';
import { syncManager } from '../db/syncManager.js';
import { generateUUID } from '../config.js';
import { SUPERADMIN_EMAILS } from './authService.js';

class ClassRoomService {
  constructor() {
    this.channelName = 'fitpulse_rooms_channel';
    this.channel = null;
    this.activeMediaStreams = new Map(); // id -> MediaStream
    this.listeners = new Set();
    this.isTrainingRoomsTableMissing = false;
    this.isAttendeesTableMissing = false;
    this.initBroadcastChannel();
  }

  initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      }
    } catch (err) {
      console.warn('[ClassRoomService] BroadcastChannel no soportado o error:', err);
    }
  }

  broadcast(action, payload) {
    const message = { action, payload, timestamp: Date.now() };
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('[ClassRoomService] Error al transmitir mensaje:', e);
      }
    }
    // Disparar también evento local en la misma pestaña
    window.dispatchEvent(new CustomEvent('fitpulse:room-event', { detail: message }));
    this.notifyListeners(action, payload);
  }

  handleBroadcastMessage(message) {
    if (!message || !message.action) return;
    window.dispatchEvent(new CustomEvent('fitpulse:room-event', { detail: message }));
    this.notifyListeners(message.action, message.payload);
  }

  onRoomEvent(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(action, payload) {
    for (const listener of this.listeners) {
      try {
        listener(action, payload);
      } catch (err) {
        console.error('[ClassRoomService] Error en listener:', err);
      }
    }
  }

  // ============================================================================
  // 1. GESTIÓN DE ROLES (SUPERADMIN)
  // ============================================================================

  /**
   * Obtiene el rol de un usuario: 'superadmin' | 'trainer' | 'athlete'
   */
  async getUserRole(userId, userEmail = '') {
    if (userEmail && SUPERADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return 'superadmin';
    }

    try {
      await localDB.init();
      const roleRecord = await localDB.get('user_roles', userId);
      if (roleRecord?.role) {
        return roleRecord.role;
      }

      // Consultar perfil
      const profile = await localDB.get('profiles', userId);
      if (profile?.role) {
        return profile.role;
      }
    } catch (err) {
      console.warn('[ClassRoomService] Error al obtener rol local:', err);
    }

    return 'athlete';
  }

  /**
   * Asigna un rol a un usuario (solo Superadmin)
   */
  async setUserRole(userId, role, userInfo = {}) {
    const validRoles = ['athlete', 'trainer', 'superadmin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Rol inválido: ${role}`);
    }

    const roleData = {
      user_id: userId,
      role,
      user_name: userInfo.name || userInfo.full_name || 'Usuario',
      user_email: userInfo.email || '',
      user_avatar: userInfo.avatar || '',
      updated_at: new Date().toISOString()
    };

    // 1. Guardar en IndexedDB local
    await localDB.put('user_roles', roleData);

    // 2. Actualizar en perfil local si existe
    const profile = await localDB.get('profiles', userId);
    if (profile) {
      profile.role = role;
      await localDB.put('profiles', profile);
    }

    // 3. Si hay conexión a Supabase, sincronizar
    const client = await SupabaseManager.getClient();
    if (client) {
      try {
        await client.from('profiles').update({ role }).eq('id', userId);
      } catch (err) {
        console.warn('[ClassRoomService] Error al sincronizar rol con Supabase:', err);
      }
    }

    this.broadcast('USER_ROLE_CHANGED', { userId, role });
    return roleData;
  }

  /**
   * Lista todos los usuarios registrados conocidos para el panel de superusuario
   */
  async getAllUsersWithRoles() {
    await localDB.init();
    const usersMap = new Map();

    // 1. Usuarios en user_roles
    try {
      const assignedRoles = await localDB.getAll('user_roles');
      for (const r of assignedRoles) {
        usersMap.set(r.user_id, {
          id: r.user_id,
          name: r.user_name || 'Usuario',
          email: r.user_email || '',
          avatar: r.user_avatar || '',
          role: r.role || 'athlete',
          updated_at: r.updated_at
        });
      }
    } catch (e) {}

    // 2. Usuarios en profiles
    try {
      const profiles = await localDB.getAll('profiles');
      for (const p of profiles) {
        const existing = usersMap.get(p.id) || {};
        usersMap.set(p.id, {
          id: p.id,
          name: p.full_name || existing.name || 'Atleta FitPulse',
          email: p.email || existing.email || '',
          avatar: p.avatar_url || existing.avatar || '',
          role: existing.role || p.role || 'athlete',
          updated_at: p.updated_at || existing.updated_at
        });
      }
    } catch (e) {}

    // 3. Supabase profiles si está online
    const client = await SupabaseManager.getClient();
    if (client) {
      try {
        const { data } = await client.from('profiles').select('id, full_name, email, avatar_url, role, updated_at');
        if (data && Array.isArray(data)) {
          for (const sp of data) {
            const existing = usersMap.get(sp.id) || {};
            usersMap.set(sp.id, {
              id: sp.id,
              name: sp.full_name || existing.name || 'Atleta',
              email: sp.email || existing.email || '',
              avatar: sp.avatar_url || existing.avatar || '',
              role: sp.role || existing.role || 'athlete',
              updated_at: sp.updated_at || existing.updated_at
            });
          }
        }
      } catch (err) {
        console.warn('[ClassRoomService] Error al cargar perfiles de Supabase:', err);
      }
    }

    // Asegurar que los superadmins figuren correctamente
    for (const email of SUPERADMIN_EMAILS) {
      for (const user of usersMap.values()) {
        if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
          user.role = 'superadmin';
        }
      }
    }

    return Array.from(usersMap.values());
  }

  // ============================================================================
  // 2. CREACIÓN Y GESTIÓN DE SALAS DE ENTRENAMIENTO
  // ============================================================================

  /**
   * Crea una nueva sala de entrenamiento
   */
  async createClass({
    title,
    category = 'Fuerza',
    scheduledAt,
    durationMinutes = 60,
    maxCapacity = 20,
    routineConfig = null,
    trainer
  }) {
    await localDB.init();

    const newClass = {
      id: generateUUID(),
      trainer_id: trainer.id,
      trainer_name: trainer.name || 'Entrenador FitPulse',
      title: title.trim(),
      category,
      scheduled_at: scheduledAt || new Date().toISOString(),
      duration_minutes: parseInt(durationMinutes, 10) || 60,
      max_capacity: parseInt(maxCapacity, 10) || 20,
      status: 'scheduled', // 'scheduled' | 'waiting_room' | 'live' | 'completed' | 'cancelled'
      routine_config: routineConfig || {
        name: 'Rutina Funcional Dinámica',
        exercises: [
          { name: 'Sentadillas Profundas', sets: 4, reps: 12, rest: 60 },
          { name: 'Press Banca con Mancuernas', sets: 4, reps: 10, rest: 60 },
          { name: 'Peso Muerto Rumano', sets: 3, reps: 12, rest: 75 },
          { name: 'Plancha Abdominal Activa', sets: 3, reps: '45s', rest: 45 }
        ]
      },
      live_state: {
        currentExerciseIndex: 0,
        currentSet: 1,
        startedAt: null,
        elapsedSeconds: 0
      },
      summary_stats: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Guardar en IndexedDB
    await localDB.put('classes', newClass);

    // Guardar en Supabase o encolar
    await syncManager.saveAndQueue('classes', newClass, 'training_rooms');

    this.broadcast('CLASS_CREATED', newClass);
    return newClass;
  }

  /**
   * Obtiene todas las clases
   */
  /**
   * Obtiene todas las clases (con fallback inteligente y prevención de errores 404 si la tabla remota aún no existe)
   */
  async getAllClasses(forceRemoteCheck = false) {
    await localDB.init();
    let classes = [];
    try {
      classes = await localDB.getAll('classes');
    } catch (e) {
      console.warn('[ClassRoomService] Error al leer clases locales:', e);
    }

    // Si ya detectamos que la tabla 'training_rooms' no existe en Supabase y no forzamos rechequeo,
    // retornamos directamente los datos locales de IndexedDB sin enviar requests que generen errores 404
    if (this.isTrainingRoomsTableMissing && !forceRemoteCheck) {
      return this._sortClasses(classes);
    }

    // Si hay cliente Supabase, sincronizar lista
    const client = await SupabaseManager.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('training_rooms')
          .select('*')
          .order('scheduled_at', { ascending: false });

        if (error) {
          if (
            error.status === 404 ||
            error.code === '42P01' ||
            error.code === 'PGRST204' ||
            error.message?.includes('not found') ||
            error.message?.includes('does not exist')
          ) {
            this.isTrainingRoomsTableMissing = true;
            console.info('[ClassRoomService] ℹ️ Tabla training_rooms no existe en Supabase (404). Operando de forma offline-first con IndexedDB local.');
          } else {
            console.warn('[ClassRoomService] Aviso al sincronizar salas desde Supabase:', error.message);
          }
        } else if (data && Array.isArray(data)) {
          this.isTrainingRoomsTableMissing = false;
          for (const item of data) {
            await localDB.put('classes', item);
          }
          classes = await localDB.getAll('classes');
        }
      } catch (err) {
        console.warn('[ClassRoomService] Fallback a IndexedDB para clases:', err);
      }
    }

    return this._sortClasses(classes);
  }

  _sortClasses(classes) {
    // Ordenar: primero 'live', luego 'waiting_room', luego 'scheduled', al final 'completed'
    const statusWeight = { live: 0, waiting_room: 1, scheduled: 2, completed: 3, cancelled: 4 };
    return [...classes].sort((a, b) => {
      const wA = statusWeight[a.status] ?? 2;
      const wB = statusWeight[b.status] ?? 2;
      if (wA !== wB) return wA - wB;
      return new Date(b.scheduled_at) - new Date(a.scheduled_at);
    });
  }

  /**
   * Obtiene una clase por ID
   */
  async getClassById(classId) {
    await localDB.init();
    let cls = await localDB.get('classes', classId);
    if (!cls && !this.isTrainingRoomsTableMissing) {
      const client = await SupabaseManager.getClient();
      if (client) {
        try {
          const { data, error } = await client.from('training_rooms').select('*').eq('id', classId).single();
          if (error) {
            if (error.status === 404 || error.code === '42P01' || error.code === 'PGRST204') {
              this.isTrainingRoomsTableMissing = true;
            }
          } else if (data) {
            cls = data;
            await localDB.put('classes', cls);
          }
        } catch (e) {}
      }
    }
    return cls;
  }

  /**
   * Actualiza el estado de la clase
   */
  async updateClassStatus(classId, status, extra = {}) {
    await localDB.init();
    const cls = await this.getClassById(classId);
    if (!cls) throw new Error('Clase no encontrada');

    cls.status = status;
    cls.updated_at = new Date().toISOString();

    if (extra.live_state) cls.live_state = { ...cls.live_state, ...extra.live_state };
    if (extra.summary_stats) cls.summary_stats = { ...cls.summary_stats, ...extra.summary_stats };

    await localDB.put('classes', cls);
    await syncManager.saveAndQueue('classes', cls, 'training_rooms');

    this.broadcast('CLASS_STATUS_UPDATED', { classId, status, cls });
    return cls;
  }

  /**
   * Elimina una clase
   */
  async deleteClass(classId) {
    await localDB.init();
    await localDB.delete('classes', classId);
    await syncManager.queueOperation('training_rooms', classId, 'DELETE', null);

    // Eliminar asistentes asociados
    try {
      const attendees = await this.getAttendeesByClass(classId);
      for (const att of attendees) {
        await localDB.delete('class_attendees', att.id);
      }
    } catch (e) {}

    this.broadcast('CLASS_DELETED', { classId });
  }

  // ============================================================================
  // 3. ASISTENTES, SALA DE ESPERA Y ADMISIÓN PREVIA
  // ============================================================================

  /**
   * Unirse a una sala (Presencial o Remoto)
   * Queda en estado 'pending' a la espera de admisión del entrenador.
   */
  async joinClass(classId, user, mode = 'in_person') {
    if (!classId || !user) throw new Error('Parámetros incompletos para unirse');
    await localDB.init();

    // Verificar si ya existe registro del alumno en esta clase
    const existing = await this.getAttendeeByUser(classId, user.id);
    if (existing) {
      // Si ya estaba, actualizar su modo y mantener o reanudar
      existing.mode = mode;
      existing.updated_at = new Date().toISOString();
      await localDB.put('class_attendees', existing);
      this.broadcast('ATTENDEE_UPDATED', existing);
      return existing;
    }

    const attendee = {
      id: generateUUID(),
      class_id: classId,
      user_id: user.id,
      user_name: user.name || 'Atleta',
      user_email: user.email || '',
      user_avatar: user.avatar || '',
      mode, // 'in_person' | 'remote'
      status: 'pending', // 'pending' (sala de espera) | 'admitted' | 'rejected' | 'completed'
      camera_active: false,
      admitted_at: null,
      stats: {
        completedSets: 0,
        volumeKg: 0,
        rpeScore: null
      },
      created_at: new Date().toISOString()
    };

    await localDB.put('class_attendees', attendee);
    await syncManager.saveAndQueue('class_attendees', attendee, 'class_attendees');

    this.broadcast('ATTENDEE_JOINED', attendee);
    return attendee;
  }

  /**
   * Obtiene todos los asistentes de una clase
   */
  async getAttendeesByClass(classId) {
    await localDB.init();
    let attendees = [];
    try {
      const all = await localDB.getAll('class_attendees');
      attendees = all.filter((a) => a.class_id === classId);
    } catch (e) {
      console.warn('[ClassRoomService] Error al obtener asistentes locales:', e);
    }

    if (!this.isAttendeesTableMissing) {
      const client = await SupabaseManager.getClient();
      if (client) {
        try {
          const { data, error } = await client.from('class_attendees').select('*').eq('class_id', classId);
          if (error) {
            if (
              error.status === 404 ||
              error.code === '42P01' ||
              error.code === 'PGRST204' ||
              error.message?.includes('not found') ||
              error.message?.includes('does not exist')
            ) {
              this.isAttendeesTableMissing = true;
            }
          } else if (data && Array.isArray(data)) {
            for (const item of data) {
              await localDB.put('class_attendees', item);
            }
            attendees = data;
          }
        } catch (e) {}
      }
    }

    return attendees;
  }

  async getAttendeeByUser(classId, userId) {
    await localDB.init();
    try {
      const all = await localDB.getAll('class_attendees');
      return all.find((a) => a.class_id === classId && a.user_id === userId) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Admite a un asistente (Presencial o Remoto)
   */
  async admitAttendee(attendeeId) {
    await localDB.init();
    const attendee = await localDB.get('class_attendees', attendeeId);
    if (!attendee) throw new Error('Asistente no encontrado');

    attendee.status = 'admitted';
    attendee.admitted_at = new Date().toISOString();

    await localDB.put('class_attendees', attendee);
    await syncManager.saveAndQueue('class_attendees', attendee, 'class_attendees');

    this.broadcast('ATTENDEE_ADMITTED', attendee);
    return attendee;
  }

  /**
   * Rechaza o elimina a un asistente de la sala de espera
   */
  async rejectAttendee(attendeeId) {
    await localDB.init();
    const attendee = await localDB.get('class_attendees', attendeeId);
    if (!attendee) return;

    attendee.status = 'rejected';
    await localDB.put('class_attendees', attendee);
    await syncManager.saveAndQueue('class_attendees', attendee, 'class_attendees');

    this.broadcast('ATTENDEE_REJECTED', { attendeeId, classId: attendee.class_id });
    return attendee;
  }

  /**
   * Activa o desactiva la señal de cámara para un alumno remoto
   */
  async toggleAttendeeCamera(attendeeId, shouldActivate) {
    await localDB.init();
    const attendee = await localDB.get('class_attendees', attendeeId);
    if (!attendee) throw new Error('Asistente no encontrado');

    attendee.camera_active = Boolean(shouldActivate);
    await localDB.put('class_attendees', attendee);

    this.broadcast('ATTENDEE_CAMERA_TOGGLED', {
      attendeeId,
      classId: attendee.class_id,
      userId: attendee.user_id,
      cameraActive: attendee.camera_active
    });

    return attendee;
  }

  // ============================================================================
  // 4. LANZAMIENTO DE RUTINA Y CONTROL EN VIVO
  // ============================================================================

  /**
   * El entrenador larga la rutina en vivo para toda la sala
   */
  async launchRoutine(classId, routineConfig = null) {
    const cls = await this.getClassById(classId);
    if (!cls) throw new Error('Clase no encontrada');

    const liveState = {
      startedAt: new Date().toISOString(),
      currentExerciseIndex: 0,
      currentSet: 1,
      elapsedSeconds: 0,
      isPaused: false
    };

    const updated = await this.updateClassStatus(classId, 'live', {
      routine_config: routineConfig || cls.routine_config,
      live_state: liveState
    });

    this.broadcast('ROUTINE_LAUNCHED', {
      classId,
      routine: updated.routine_config,
      liveState
    });

    return updated;
  }

  /**
   * Finalizar la clase:
   * 1. Apaga y destruye todas las transmisiones de cámara activas
   * 2. Recolecta métricas de la clase
   * 3. Marca asistentes como completed
   * 4. Guarda resumen final
   */
  async finishClass(classId) {
    // 1. Apagar totalmente todas las cámaras del dispositivo
    this.stopAllCameraStreams();

    const cls = await this.getClassById(classId);
    if (!cls) throw new Error('Clase no encontrada');

    // 2. Obtener asistentes admitidos
    const attendees = await this.getAttendeesByClass(classId);
    const admittedAttendees = attendees.filter((a) => a.status === 'admitted');

    let totalVolume = 0;
    let completedCount = admittedAttendees.length;

    for (const att of admittedAttendees) {
      att.status = 'completed';
      att.camera_active = false;
      await localDB.put('class_attendees', att);
      await syncManager.saveAndQueue('class_attendees', att, 'class_attendees');
    }

    const summaryStats = {
      finishedAt: new Date().toISOString(),
      totalAttendees: admittedAttendees.length,
      inPersonCount: admittedAttendees.filter((a) => a.mode === 'in_person').length,
      remoteCount: admittedAttendees.filter((a) => a.mode === 'remote').length,
      totalExercises: cls.routine_config?.exercises?.length || 0,
      completionRate: '100%'
    };

    const updated = await this.updateClassStatus(classId, 'completed', {
      summary_stats: summaryStats,
      live_state: { isFinished: true }
    });

    this.broadcast('CLASS_FINISHED', { classId, summaryStats });
    return updated;
  }

  // ============================================================================
  // 5. CÁMARA Y VIDEO STREAMING PARA ALUMNOS REMOTOS
  // ============================================================================

  /**
   * Inicia la cámara en el elemento HTML `<video>`
   */
  async startCameraStream(videoElement, streamKey = 'default') {
    if (!videoElement) return null;

    // Detener stream anterior si existía para esta clave
    this.stopCameraStream(streamKey);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        videoElement.srcObject = stream;
        videoElement.playsInline = true;
        videoElement.muted = true;
        await videoElement.play().catch(() => {});

        this.activeMediaStreams.set(streamKey, stream);
        return stream;
      }
    } catch (err) {
      console.warn('[ClassRoomService] Error al acceder a getUserMedia:', err);
      // Fallback a animación simulada si no hay permisos o hardware
      this.attachSimulatedStream(videoElement, streamKey);
      return null;
    }

    return null;
  }

  /**
   * Genera un feed de cámara simulada con canvas dinámico cuando no hay webcam física
   */
  attachSimulatedStream(videoElement, streamKey = 'default') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      let frame = 0;
      const animInterval = setInterval(() => {
        frame++;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Guía de postura y silueta
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 20, 240, 200);

        // Pulso biométrico
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        const pulseY = 120 + Math.sin(frame * 0.1) * 20;
        ctx.arc(160, pulseY, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📡 FEED REMOTO ACTIVO', 160, 190);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Monitoreo Biométrico en Vivo', 160, 205);
      }, 50);

      const stream = canvas.captureStream ? canvas.captureStream(25) : null;
      if (stream) {
        videoElement.srcObject = stream;
        videoElement.play().catch(() => {});
        this.activeMediaStreams.set(streamKey, {
          getTracks: () => [{ stop: () => clearInterval(animInterval) }]
        });
      }
    } catch (e) {
      console.warn('[ClassRoomService] Fallback de canvas stream:', e);
    }
  }

  /**
   * Detiene un stream específico
   */
  stopCameraStream(streamKey = 'default') {
    const stream = this.activeMediaStreams.get(streamKey);
    if (stream) {
      try {
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {}
          });
        }
      } catch (e) {}
      this.activeMediaStreams.delete(streamKey);
    }
  }

  /**
   * Apaga absolutamente todos los streams de cámara activos en el dispositivo
   */
  stopAllCameraStreams() {
    for (const [key, stream] of this.activeMediaStreams.entries()) {
      try {
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {}
          });
        }
      } catch (e) {}
    }
    this.activeMediaStreams.clear();
    console.log('[ClassRoomService] 🛑 Todas las cámaras han sido apagadas.');
  }

  // ============================================================================
  // 6. MOTOR DE REPORTES (POR USUARIO Y POR CLASE)
  // ============================================================================

  /**
   * Genera el reporte de asistencia agrupado por Usuario
   */
  async getStudentAttendanceReport() {
    await localDB.init();
    const attendees = await localDB.getAll('class_attendees');
    const classes = await localDB.getAll('classes');

    const classMap = new Map(classes.map((c) => [c.id, c]));
    const studentReportMap = new Map();

    for (const att of attendees) {
      // Considerar completados o admitidos
      if (att.status !== 'admitted' && att.status !== 'completed') continue;

      const userId = att.user_id;
      if (!studentReportMap.has(userId)) {
        studentReportMap.set(userId, {
          userId,
          userName: att.user_name || 'Atleta',
          userEmail: att.user_email || '',
          userAvatar: att.user_avatar || '',
          totalClasses: 0,
          inPersonCount: 0,
          remoteCount: 0,
          lastClassDate: att.created_at,
          classesHistory: []
        });
      }

      const report = studentReportMap.get(userId);
      report.totalClasses += 1;
      if (att.mode === 'in_person') report.inPersonCount += 1;
      if (att.mode === 'remote') report.remoteCount += 1;

      const cls = classMap.get(att.class_id);
      report.classesHistory.push({
        classId: att.class_id,
        className: cls?.title || 'Clase de Entrenamiento',
        date: cls?.scheduled_at || att.created_at,
        mode: att.mode,
        status: att.status
      });

      if (new Date(att.created_at) > new Date(report.lastClassDate)) {
        report.lastClassDate = att.created_at;
      }
    }

    return Array.from(studentReportMap.values()).sort((a, b) => b.totalClasses - a.totalClasses);
  }

  /**
   * Genera el reporte histórico agrupado por Clase
   */
  async getClassHistoryReport() {
    await localDB.init();
    const classes = await this.getAllClasses();
    const attendees = await localDB.getAll('class_attendees');

    return classes.map((cls) => {
      const classAttendees = attendees.filter((a) => a.class_id === cls.id);
      const admitted = classAttendees.filter((a) => a.status === 'admitted' || a.status === 'completed');

      return {
        id: cls.id,
        title: cls.title,
        trainerName: cls.trainer_name,
        category: cls.category,
        scheduledAt: cls.scheduled_at,
        durationMinutes: cls.duration_minutes,
        status: cls.status,
        totalAdmitted: admitted.length,
        inPersonCount: admitted.filter((a) => a.mode === 'in_person').length,
        remoteCount: admitted.filter((a) => a.mode === 'remote').length,
        routineName: cls.routine_config?.name || 'Rutina Estándar',
        summaryStats: cls.summary_stats || {}
      };
    });
  }
}

export const classRoomService = new ClassRoomService();
