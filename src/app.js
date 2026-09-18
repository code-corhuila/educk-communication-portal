import { checkBackendHealth, fetchConversation, sendMessageApi } from './api.js';

// ============================================================
// CONSTANTS & INITIAL MOCK DATA
// ============================================================
const CURRENT_USER_ID = '11111111-1111-1111-1111-111111111111'; // Ximena Zambrano (Padre)
const TEACHER_USER_ID = '22222222-2222-2222-2222-222222222222'; // Prof. Carlos Mendoza

const INITIAL_GRADES = [
  { id: 'gr-1', subject: 'Matemáticas', teacher: 'Prof. Carlos Mendoza', title: 'Examen Parcial Álgebra', date: '2026-09-05', score: 4.8, status: 'Aprobado', obs: 'Excelente dominio de ecuaciones cuadráticas.' },
  { id: 'gr-2', subject: 'Física', teacher: 'Prof. Laura Morales', title: 'Laboratorio Cinemática', date: '2026-09-02', score: 4.2, status: 'Aprobado', obs: 'Buen trabajo en equipo y presentación de informe.' },
  { id: 'gr-3', subject: 'Lenguaje', teacher: 'Prof. María Rodríguez', title: 'Ensayo Argumentativo', date: '2026-08-29', score: 3.8, status: 'Aprobado', obs: 'Estructura adecuada, reforzar conectores lógicos.' },
  { id: 'gr-4', subject: 'Química', teacher: 'Prof. Andrés Silva', title: 'Balanceo de Ecuaciones', date: '2026-08-26', score: 4.6, status: 'Aprobado', obs: 'Destacada participación en clase y resolución rápida.' },
  { id: 'gr-5', subject: 'Ciencias Sociales', teacher: 'Prof. Diana Castro', title: 'Análisis Geopolítico', date: '2026-08-22', score: 4.5, status: 'Aprobado', obs: 'Muy buen análisis crítico de coyuntura.' }
];

const INITIAL_ATTENDANCE = [
  { id: 'att-1', date: '2026-09-05', subject: 'Matemáticas', seq: 'EVENT-ATT-024', status: 'Presente', obs: 'Asistencia puntual (07:00 AM)' },
  { id: 'att-2', date: '2026-09-04', subject: 'Física', seq: 'EVENT-ATT-023', status: 'Presente', obs: 'Asistencia puntual (09:00 AM)' },
  { id: 'att-3', date: '2026-09-03', subject: 'Matemáticas', seq: 'EVENT-ATT-022', status: 'Ausente', obs: 'Inasistencia reportada (Bloque 1)' },
  { id: 'att-4', date: '2026-09-02', subject: 'Química', seq: 'EVENT-ATT-021', status: 'Presente', obs: 'Asistencia puntual (07:00 AM)' },
  { id: 'att-5', date: '2026-09-01', subject: 'Lenguaje', seq: 'EVENT-ATT-020', status: 'Presente', obs: 'Asistencia puntual (08:30 AM)' },
  { id: 'att-6', date: '2026-08-29', subject: 'Ciencias Sociales', seq: 'EVENT-ATT-019', status: 'Retardo', obs: 'Ingreso 15 min tarde con excusa médica' }
];

const INITIAL_NOTIFICATIONS = [
  { id: 'nt-1', type: 'academic', title: 'Nueva Calificación Publicada', desc: 'El docente Carlos Mendoza publicó la nota de "Examen Parcial Álgebra": 4.8 / 5.0', time: 'Hace 15 min', read: false },
  { id: 'nt-2', type: 'attendance', title: 'Alerta de Inasistencia', desc: 'Se registró inasistencia de Sofía en la clase de Matemáticas (03 Sep).', time: 'Hace 2 días', read: false },
  { id: 'nt-3', type: 'message', title: 'Mensaje de Docente', desc: 'Prof. Carlos Mendoza: "Buenas tardes Sra. Ximena, le informo que la entrega..."', time: 'Ayer', read: true },
  { id: 'nt-4', type: 'academic', title: 'Reporte de Corte Académico', desc: 'El corte 1 ha finalizado satisfactoriamente con un promedio superior a 4.0.', time: 'Hace 4 días', read: true }
];

const INITIAL_NOTES = [
  { id: 'note-1', text: 'Firmar autorización para salida pedagógica de física', done: false },
  { id: 'note-2', text: 'Consultar al Prof. Carlos sobre el taller de álgebra', done: true }
];

// ============================================================
// STATE MANAGEMENT (with LocalStorage persistence)
// ============================================================
let currentView = 'mensajeria';
let gradesList = loadFromStorage('edutrack_grades', INITIAL_GRADES);
let attendanceList = loadFromStorage('edutrack_attendance', INITIAL_ATTENDANCE);
let notificationsList = loadFromStorage('edutrack_notifications', INITIAL_NOTIFICATIONS);
let tutorNotes = loadFromStorage('edutrack_tutor_notes', INITIAL_NOTES);
let currentAttendanceFilter = 'all';
let currentNotifFilter = 'all';
let isSending = false;

function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ============================================================
// TOAST NOTIFICATION UTILITY
// ============================================================
function showToast(msg, icon = 'ℹ️') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ============================================================
// NAVIGATION & VIEW SWITCHING
// ============================================================
const viewMeta = {
  dashboard: { module: 'Visión General', view: 'Dashboard Ejecutivo' },
  calificaciones: { module: 'Académico', view: 'Libro de Calificaciones' },
  asistencias: { module: 'Asistencia', view: 'Control de Asistencias y Causalidad' },
  mensajeria: { module: 'Comunicación', view: 'Chat Padre-Profesor' },
  notificaciones: { module: 'Alertas', view: 'Centro de Notificaciones' }
};

function switchView(viewName) {
  if (!viewMeta[viewName]) return;
  currentView = viewName;

  // Update nav items active state
  document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update views active state
  document.querySelectorAll('.app-view').forEach(viewEl => {
    if (viewEl.id === `view-${viewName}`) {
      viewEl.classList.add('active');
    } else {
      viewEl.classList.remove('active');
    }
  });

  // Update topbar breadcrumb
  const meta = viewMeta[viewName];
  const bcModule = document.getElementById('bc-module');
  const bcView = document.getElementById('bc-view');
  if (bcModule) bcModule.textContent = meta.module;
  if (bcView) bcView.textContent = meta.view;

  // Update topbar action buttons based on view
  const topbarActions = document.getElementById('topbar-actions');
  if (topbarActions) {
    if (viewName === 'mensajeria') {
      topbarActions.innerHTML = `
        <button id="btn-refresh" class="btn btn-secondary" title="Actualizar conversación">
          🔄 Recargar
        </button>
      `;
      const btnRefresh = document.getElementById('btn-refresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          loadConversation();
          updateBackendStatus();
          showToast('Conversación actualizada', '🔄');
        });
      }
    } else if (viewName === 'calificaciones') {
      topbarActions.innerHTML = `
        <button id="btn-top-add-grade" class="btn btn-primary" style="height: 38px;">
          <span>+ Nueva Calificación</span>
        </button>
      `;
      const btnTopAddGrade = document.getElementById('btn-top-add-grade');
      if (btnTopAddGrade) {
        btnTopAddGrade.addEventListener('click', openGradeModal);
      }
    } else if (viewName === 'asistencias') {
      topbarActions.innerHTML = `
        <button id="btn-top-scroll-att" class="btn btn-primary" style="height: 38px;">
          <span>📅 Registrar Asistencia</span>
        </button>
      `;
      const btnTopScrollAtt = document.getElementById('btn-top-scroll-att');
      if (btnTopScrollAtt) {
        btnTopScrollAtt.addEventListener('click', () => {
          document.getElementById('att-input-date')?.focus();
        });
      }
    } else if (viewName === 'notificaciones') {
      topbarActions.innerHTML = `
        <button id="btn-top-mark-read" class="btn btn-secondary" style="height: 38px;">
          <span>✓ Todo Leído</span>
        </button>
      `;
      const btnTopMarkRead = document.getElementById('btn-top-mark-read');
      if (btnTopMarkRead) {
        btnTopMarkRead.addEventListener('click', markAllNotificationsRead);
      }
    } else {
      topbarActions.innerHTML = `
        <button id="btn-top-sync-dash" class="btn btn-secondary" title="Sincronizar">
          ⚡ Actualizar Vista
        </button>
      `;
      const btnTopSyncDash = document.getElementById('btn-top-sync-dash');
      if (btnTopSyncDash) {
        btnTopSyncDash.addEventListener('click', () => {
          updateDashboard();
          showToast('Dashboard sincronizado', '⚡');
        });
      }
    }
  }

  // Refresh view contents if needed
  if (viewName === 'dashboard') updateDashboard();
  if (viewName === 'calificaciones') renderGrades();
  if (viewName === 'asistencias') renderAttendance();
  if (viewName === 'notificaciones') renderNotifications();
}

// Setup navigation listeners
function setupNavigation() {
  document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (targetView) switchView(targetView);
    });
  });

  // Buttons with data-nav-target
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav-target]');
    if (btn) {
      const target = btn.getAttribute('data-nav-target');
      if (target) switchView(target);
    }
  });
}

// ============================================================
// CALIFICACIONES MODULE
// ============================================================
function calculateGradesAverage() {
  if (gradesList.length === 0) return 0;
  const sum = gradesList.reduce((acc, curr) => acc + Number(curr.score), 0);
  return (sum / gradesList.length).toFixed(1);
}

function renderGrades() {
  const tableBody = document.getElementById('grades-table-body');
  const searchInput = document.getElementById('filter-grade-search');
  const subjectSelect = document.getElementById('filter-grade-subject');
  const avgSummary = document.getElementById('grades-summary-avg');

  const avg = calculateGradesAverage();
  if (avgSummary) avgSummary.textContent = avg;

  if (!tableBody) return;

  const searchQuery = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const subjectFilter = subjectSelect ? subjectSelect.value : 'all';

  const filtered = gradesList.filter(g => {
    const matchesSubject = (subjectFilter === 'all') || (g.subject === subjectFilter);
    const matchesSearch = !searchQuery ||
      g.title.toLowerCase().includes(searchQuery) ||
      g.teacher.toLowerCase().includes(searchQuery) ||
      g.subject.toLowerCase().includes(searchQuery);
    return matchesSubject && matchesSearch;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No se encontraron evaluaciones con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(g => {
    const scoreNum = Number(g.score);
    let badgeClass = 'pass';
    if (scoreNum < 3.0) badgeClass = 'danger';
    else if (scoreNum < 4.0) badgeClass = 'info';

    return `
      <tr>
        <td><strong>${escapeHtml(g.subject)}</strong></td>
        <td style="color: var(--text-muted);">${escapeHtml(g.teacher)}</td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(g.title)}</div>
          ${g.obs ? `<small style="color: var(--text-muted);">${escapeHtml(g.obs)}</small>` : ''}
        </td>
        <td style="color: var(--text-muted);">${escapeHtml(g.date)}</td>
        <td>
          <span class="badge-tag ${badgeClass}">
            ★ ${scoreNum.toFixed(1)}
          </span>
        </td>
        <td>
          <span class="badge-tag ${scoreNum >= 3.0 ? 'pass' : 'danger'}">
            ${scoreNum >= 3.0 ? 'Aprobado' : 'Reprobado'}
          </span>
        </td>
        <td>
          <button class="btn-sm-icon btn-delete-grade" data-grade-id="${g.id}" title="Eliminar evaluación">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Wire up delete buttons
  tableBody.querySelectorAll('.btn-delete-grade').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-grade-id');
      deleteGrade(id);
    });
  });
}

function deleteGrade(id) {
  gradesList = gradesList.filter(g => g.id !== id);
  saveToStorage('edutrack_grades', gradesList);
  renderGrades();
  updateDashboard();
  showToast('Evaluación eliminada correctamente', '🗑️');
}

function openGradeModal() {
  const modal = document.getElementById('modal-grade');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('modal-grade-title')?.focus();
  }
}

function closeGradeModal() {
  const modal = document.getElementById('modal-grade');
  if (modal) modal.classList.remove('open');
}

function handleAddGradeSubmit(e) {
  e.preventDefault();
  const subject = document.getElementById('modal-grade-subject')?.value || 'Matemáticas';
  const title = document.getElementById('modal-grade-title')?.value.trim();
  const teacher = document.getElementById('modal-grade-teacher')?.value.trim() || 'Docente Titular';
  const score = parseFloat(document.getElementById('modal-grade-score')?.value);
  const obs = document.getElementById('modal-grade-obs')?.value.trim();

  if (!title || isNaN(score) || score < 1.0 || score > 5.0) {
    showToast('Ingresa un título y una nota válida entre 1.0 y 5.0', '⚠️');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const newGrade = {
    id: 'gr-' + Date.now(),
    subject,
    teacher,
    title,
    date: today,
    score,
    status: score >= 3.0 ? 'Aprobado' : 'Reprobado',
    obs
  };

  gradesList.unshift(newGrade);
  saveToStorage('edutrack_grades', gradesList);

  // Add event notification
  addNotification({
    type: 'academic',
    title: 'Calificación Registrada',
    desc: `Se ha registrado la evaluación "${title}" en ${subject} con nota ${score.toFixed(1)}.`,
    time: 'Justo ahora'
  });

  closeGradeModal();
  document.getElementById('form-add-grade')?.reset();
  renderGrades();
  updateDashboard();
  showToast(`Calificación agregada: ${subject} (${score.toFixed(1)})`, '✅');
}

// ============================================================
// ASISTENCIAS MODULE
// ============================================================
function calculateAttendanceStats() {
  const total = attendanceList.length;
  if (total === 0) return { total: 0, present: 0, absent: 0, late: 0, rate: '100%' };

  let present = 0;
  let absent = 0;
  let late = 0;

  attendanceList.forEach(a => {
    if (a.status === 'Presente' || a.status === 'Justificada') present++;
    else if (a.status === 'Ausente') absent++;
    else if (a.status === 'Retardo') { present++; late++; }
  });

  const rate = ((present / total) * 100).toFixed(1) + '%';
  return { total, present, absent, late, rate };
}

function renderAttendance() {
  const tableBody = document.getElementById('att-table-body');
  const stats = calculateAttendanceStats();

  const totalEl = document.getElementById('att-kpi-total');
  const presentEl = document.getElementById('att-kpi-present');
  const absentEl = document.getElementById('att-kpi-absent');
  const rateEl = document.getElementById('att-kpi-rate');

  if (totalEl) totalEl.textContent = stats.total;
  if (presentEl) presentEl.textContent = stats.present;
  if (absentEl) absentEl.textContent = stats.absent;
  if (rateEl) rateEl.textContent = stats.rate;

  if (!tableBody) return;

  const filtered = attendanceList.filter(a => {
    if (currentAttendanceFilter === 'all') return true;
    return a.status === currentAttendanceFilter;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No hay registros de asistencia en esta categoría.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(a => {
    let badgeClass = 'pass';
    if (a.status === 'Ausente') badgeClass = 'danger';
    else if (a.status === 'Retardo') badgeClass = 'warning';
    else if (a.status === 'Justificada') badgeClass = 'info';

    return `
      <tr>
        <td style="font-weight: 500;">${escapeHtml(a.date)}</td>
        <td><strong>${escapeHtml(a.subject)}</strong></td>
        <td>
          <code style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
            ${escapeHtml(a.seq)}
          </code>
        </td>
        <td>
          <span class="badge-tag ${badgeClass}">
            ${escapeHtml(a.status)}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.825rem;">
          ${escapeHtml(a.obs || 'Sin observaciones')}
        </td>
        <td>
          ${a.status === 'Ausente' ? `
            <button class="btn-sm-action btn-justify-att" data-att-id="${a.id}">
              Justificar
            </button>
          ` : `
            <button class="btn-sm-icon btn-delete-att" data-att-id="${a.id}" title="Eliminar registro">
              🗑️
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Wire up action buttons
  tableBody.querySelectorAll('.btn-justify-att').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-att-id');
      justifyAttendance(id);
    });
  });

  tableBody.querySelectorAll('.btn-delete-att').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-att-id');
      deleteAttendance(id);
    });
  });
}

function justifyAttendance(id) {
  const item = attendanceList.find(a => a.id === id);
  if (!item) return;
  const reason = prompt('Ingrese motivo de justificación médica o familiar:', 'Cita médica justificada por acudiente');
  if (reason) {
    item.status = 'Justificada';
    item.obs = reason;
    saveToStorage('edutrack_attendance', attendanceList);
    renderAttendance();
    updateDashboard();
    showToast('Inasistencia justificada correctamente', '📋');
  }
}

function deleteAttendance(id) {
  attendanceList = attendanceList.filter(a => a.id !== id);
  saveToStorage('edutrack_attendance', attendanceList);
  renderAttendance();
  updateDashboard();
  showToast('Registro de asistencia eliminado', '🗑️');
}

function handleAddAttendanceSubmit(e) {
  e.preventDefault();
  const dateInput = document.getElementById('att-input-date');
  const subjectSelect = document.getElementById('att-input-subject');
  const statusSelect = document.getElementById('att-input-status');
  const obsInput = document.getElementById('att-input-obs');

  const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  const subject = subjectSelect ? subjectSelect.value : 'Matemáticas';
  const status = statusSelect ? statusSelect.value : 'Presente';
  const obs = obsInput ? obsInput.value.trim() : '';

  const seqNumber = (attendanceList.length + 20).toString().padStart(3, '0');
  const newRecord = {
    id: 'att-' + Date.now(),
    date,
    subject,
    seq: `EVENT-ATT-${seqNumber}`,
    status,
    obs: obs || (status === 'Presente' ? 'Asistencia regular' : 'Registrado por docente')
  };

  attendanceList.unshift(newRecord);
  saveToStorage('edutrack_attendance', attendanceList);

  if (status === 'Ausente') {
    addNotification({
      type: 'attendance',
      title: 'Inasistencia Registrada',
      desc: `Se ha registrado ausencia de Sofía en ${subject} el día ${date}.`,
      time: 'Justo ahora'
    });
  }

  if (obsInput) obsInput.value = '';
  renderAttendance();
  updateDashboard();
  showToast(`Asistencia registrada: ${subject} (${status})`, '📅');
}

// ============================================================
// NOTIFICACIONES MODULE
// ============================================================
function addNotification(item) {
  const notif = {
    id: 'nt-' + Date.now(),
    read: false,
    ...item
  };
  notificationsList.unshift(notif);
  saveToStorage('edutrack_notifications', notificationsList);
  renderNotifications();
  updateDashboard();
}

function markAllNotificationsRead() {
  notificationsList.forEach(n => n.read = true);
  saveToStorage('edutrack_notifications', notificationsList);
  renderNotifications();
  updateDashboard();
  showToast('Todas las notificaciones marcadas como leídas', '✓');
}

function clearReadNotifications() {
  notificationsList = notificationsList.filter(n => !n.read);
  saveToStorage('edutrack_notifications', notificationsList);
  renderNotifications();
  updateDashboard();
  showToast('Notificaciones leídas eliminadas', '🗑️');
}

function simulateRandomNotification() {
  const templates = [
    { type: 'academic', title: 'Circular de Entrega de Tareas', desc: 'El docente de Lenguaje recuerda entrega de la lectura complementaria para este viernes.' },
    { type: 'attendance', title: 'Reporte de Puntualidad Semanal', desc: 'Sofía ha completado la semana con 100% de asistencia puntual.' },
    { type: 'message', title: 'Nuevo Mensaje en Chat', desc: 'Prof. Carlos Mendoza ha actualizado las pautas de evaluación para matemáticas.' },
    { type: 'academic', title: 'Convocatoria Olimpiadas Matemáticas', desc: 'Felicitaciones: Sofía ha sido preseleccionada para las olimpiadas intercolegiales.' }
  ];
  const t = templates[Math.floor(Math.random() * templates.length)];
  addNotification({
    type: t.type,
    title: t.title,
    desc: t.desc,
    time: 'Hace un momento'
  });
  showToast(`Nueva alerta: ${t.title}`, '🔔');
}

function renderNotifications() {
  const container = document.getElementById('notif-list-container');
  const countEl = document.getElementById('notif-unread-count');
  const navBadge = document.getElementById('nav-notif-badge');

  const unreadCount = notificationsList.filter(n => !n.read).length;
  if (countEl) countEl.textContent = unreadCount;
  if (navBadge) {
    navBadge.textContent = unreadCount;
    navBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }

  if (!container) return;

  const filtered = notificationsList.filter(n => {
    if (currentNotifFilter === 'unread') return !n.read;
    if (currentNotifFilter === 'all') return true;
    return n.type === currentNotifFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px; background: #fff; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        🎉 No hay notificaciones en este filtro.
      </div>
    `;
    return;
  }

  const iconMap = {
    academic: '📝',
    attendance: '⚠️',
    message: '💬'
  };

  const bgMap = {
    academic: '#eff6ff',
    attendance: '#fef2f2',
    message: '#f0fdf4'
  };

  container.innerHTML = filtered.map(n => {
    const icon = iconMap[n.type] || '🔔';
    const bg = bgMap[n.type] || '#f8fafc';

    return `
      <div class="notif-item ${!n.read ? 'unread' : ''}" data-notif-id="${n.id}">
        <div class="notif-icon-box" style="background: ${bg};">
          ${icon}
        </div>
        <div class="notif-body">
          <div class="notif-title-row">
            <strong>
              ${escapeHtml(n.title)}
              ${!n.read ? '<span class="notif-dot"></span>' : ''}
            </strong>
            <small style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(n.time)}</small>
          </div>
          <p class="notif-desc">${escapeHtml(n.desc)}</p>
          <div class="notif-footer-row">
            <span class="badge-tag gray" style="font-size: 0.7rem; text-transform: capitalize;">
              ${n.type === 'academic' ? 'Académica' : n.type === 'attendance' ? 'Asistencia' : 'Mensajería'}
            </span>
            <button class="btn-sm-icon btn-delete-notif" data-notif-id="${n.id}" title="Descartar">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire click to mark read
  container.querySelectorAll('.notif-item').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-notif')) return;
      const id = card.getAttribute('data-notif-id');
      const item = notificationsList.find(n => n.id === id);
      if (item && !item.read) {
        item.read = true;
        saveToStorage('edutrack_notifications', notificationsList);
        renderNotifications();
        updateDashboard();
      }
    });
  });

  // Wire delete notification
  container.querySelectorAll('.btn-delete-notif').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-notif-id');
      notificationsList = notificationsList.filter(n => n.id !== id);
      saveToStorage('edutrack_notifications', notificationsList);
      renderNotifications();
      updateDashboard();
    });
  });
}

// ============================================================
// DASHBOARD MODULE
// ============================================================
function updateDashboard() {
  const dashAvg = document.getElementById('dash-kpi-promedio');
  const dashAtt = document.getElementById('dash-kpi-asistencia');
  const dashAttSub = document.getElementById('dash-kpi-asistencia-sub');
  const dashNotif = document.getElementById('dash-kpi-notif');
  const progressList = document.getElementById('dash-subject-progress');
  const recentActivities = document.getElementById('dash-recent-activities');

  // 1. Avg score
  const avg = calculateGradesAverage();
  if (dashAvg) dashAvg.textContent = avg;

  // 2. Attendance stats
  const attStats = calculateAttendanceStats();
  if (dashAtt) dashAtt.textContent = attStats.rate;
  if (dashAttSub) dashAttSub.textContent = `${attStats.total} sesiones registradas`;

  // 3. Unread notifications
  const unreadCount = notificationsList.filter(n => !n.read).length;
  if (dashNotif) dashNotif.textContent = unreadCount;

  // 4. Progress by subject
  if (progressList) {
    const subjects = ['Matemáticas', 'Física', 'Lenguaje', 'Química', 'Ciencias Sociales'];
    const colors = ['blue', 'green', 'purple', 'amber', 'blue'];

    progressList.innerHTML = subjects.map((sub, idx) => {
      const subGrades = gradesList.filter(g => g.subject === sub);
      const subAvg = subGrades.length > 0
        ? (subGrades.reduce((a, b) => a + Number(b.score), 0) / subGrades.length).toFixed(1)
        : '4.0';
      const pct = Math.min(100, Math.round((Number(subAvg) / 5.0) * 100));
      const color = colors[idx % colors.length];

      return `
        <div class="progress-item">
          <div class="progress-labels">
            <span>${sub}</span>
            <strong style="color: var(--text-main);">${subAvg} / 5.0 (${pct}%)</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${color}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Recent Activities
  if (recentActivities) {
    const recentEvents = [
      ...gradesList.slice(0, 3).map(g => ({
        date: g.date,
        type: '📝 Calificación',
        detail: `${g.subject} — ${g.title}`,
        value: `★ ${Number(g.score).toFixed(1)}`,
        status: g.status,
        badge: Number(g.score) >= 3.0 ? 'pass' : 'danger'
      })),
      ...attendanceList.slice(0, 3).map(a => ({
        date: a.date,
        type: '📅 Asistencia',
        detail: `${a.subject} (${a.seq})`,
        value: a.status,
        status: a.status === 'Presente' ? 'Puntual' : a.status,
        badge: a.status === 'Presente' ? 'pass' : a.status === 'Ausente' ? 'danger' : 'warning'
      }))
    ];

    recentEvents.sort((a, b) => (b.date > a.date ? 1 : -1));

    recentActivities.innerHTML = recentEvents.slice(0, 5).map(ev => `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(ev.date)}</td>
        <td><strong>${escapeHtml(ev.type)}</strong></td>
        <td>${escapeHtml(ev.detail)}</td>
        <td><strong>${escapeHtml(ev.value)}</strong></td>
        <td><span class="badge-tag ${ev.badge}">${escapeHtml(ev.status)}</span></td>
      </tr>
    `).join('');
  }

  // 6. Render tutor notes
  renderTutorNotes();
}

function renderTutorNotes() {
  const notesListEl = document.getElementById('notes-list');
  if (!notesListEl) return;

  if (tutorNotes.length === 0) {
    notesListEl.innerHTML = `<small style="color: var(--text-muted);">No hay recordatorios pendientes.</small>`;
    return;
  }

  notesListEl.innerHTML = tutorNotes.map(n => `
    <div class="note-row ${n.done ? 'done' : ''}" data-note-id="${n.id}">
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" class="chk-toggle-note" ${n.done ? 'checked' : ''}>
        <span>${escapeHtml(n.text)}</span>
      </div>
      <button class="btn-sm-icon btn-del-note" title="Eliminar nota">✕</button>
    </div>
  `).join('');

  notesListEl.querySelectorAll('.chk-toggle-note').forEach(chk => {
    chk.addEventListener('change', () => {
      const row = chk.closest('.note-row');
      const id = row.getAttribute('data-note-id');
      const note = tutorNotes.find(n => n.id === id);
      if (note) {
        note.done = chk.checked;
        saveToStorage('edutrack_tutor_notes', tutorNotes);
        renderTutorNotes();
      }
    });
  });

  notesListEl.querySelectorAll('.btn-del-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.note-row');
      const id = row.getAttribute('data-note-id');
      tutorNotes = tutorNotes.filter(n => n.id !== id);
      saveToStorage('edutrack_tutor_notes', tutorNotes);
      renderTutorNotes();
    });
  });
}

function handleAddNote(e) {
  e.preventDefault();
  const input = document.getElementById('note-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  tutorNotes.unshift({
    id: 'note-' + Date.now(),
    text,
    done: false
  });
  saveToStorage('edutrack_tutor_notes', tutorNotes);
  input.value = '';
  renderTutorNotes();
  showToast('Recordatorio añadido', '📌');
}

// ============================================================
// MENSAJERÍA (LIVE BACKEND CHAT ON :8085)
// ============================================================
const messagesBody = document.getElementById('messages-body');
const messageForm = document.getElementById('message-form');
const messageContentInput = document.getElementById('message-content');
const charCountSpan = document.getElementById('char-count');
const btnSend = document.getElementById('btn-send');
const errorBanner = document.getElementById('error-banner');
const errorMessageSpan = document.getElementById('error-message');
const btnCloseAlert = document.getElementById('btn-close-alert');
const backendLabel = document.getElementById('backend-label');
const backendStatusDot = document.querySelector('.status-dot');
const kpiTotalMessages = document.getElementById('kpi-total-messages');
const convPreview = document.getElementById('conv-preview');

function formatTimestamp(isoString) {
  if (!isoString) return 'Justo ahora';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function showError(msg) {
  if (errorMessageSpan) errorMessageSpan.textContent = msg;
  if (errorBanner) errorBanner.style.display = 'flex';
}

function hideError() {
  if (errorBanner) errorBanner.style.display = 'none';
}

function renderMessages(messages) {
  if (!messagesBody) return;
  messagesBody.innerHTML = '';

  const total = messages ? messages.length : 0;
  if (kpiTotalMessages) kpiTotalMessages.textContent = total;

  const dashKpiMsg = document.getElementById('dash-kpi-mensajes');
  if (dashKpiMsg) dashKpiMsg.textContent = total;

  if (!messages || messages.length === 0) {
    messagesBody.innerHTML = `
      <div class="loading-spinner">
        No hay mensajes previos en esta conversación.<br>
        <small style="color: #64748b;">Escribe el primer mensaje a continuación.</small>
      </div>
    `;
    if (convPreview) convPreview.textContent = 'Sin mensajes previos';
    return;
  }

  const lastMsg = messages[messages.length - 1];
  if (convPreview) convPreview.textContent = lastMsg.content || 'Sin contenido';

  messages.forEach(msg => {
    const isSentByMe = msg.senderId === CURRENT_USER_ID;
    const row = document.createElement('div');
    row.className = `message-row ${isSentByMe ? 'sent' : 'received'}`;

    row.innerHTML = `
      <div class="message-bubble">
        ${escapeHtml(msg.content)}
      </div>
      <div class="message-meta">
        <span>${isSentByMe ? 'Tú' : 'Prof. Carlos Mendoza'}</span>
        <span>•</span>
        <span>${formatTimestamp(msg.createdAt)}</span>
        ${isSentByMe ? '<span>✓✓</span>' : ''}
      </div>
    `;

    messagesBody.appendChild(row);
  });

  messagesBody.scrollTop = messagesBody.scrollHeight;
}

async function loadConversation() {
  try {
    const messages = await fetchConversation(CURRENT_USER_ID, TEACHER_USER_ID);
    renderMessages(messages);
  } catch (err) {
    console.error('Error cargando conversación:', err);
    showError('No se pudo conectar con el microservicio: ' + err.message);
  }
}

async function updateBackendStatus() {
  try {
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      if (backendStatusDot) backendStatusDot.className = 'status-dot online';
      if (backendLabel) backendLabel.textContent = 'Conectado (8085)';
    } else {
      if (backendStatusDot) backendStatusDot.className = 'status-dot offline';
      if (backendLabel) backendLabel.textContent = 'Desconectado';
    }
  } catch (e) {
    if (backendStatusDot) backendStatusDot.className = 'status-dot offline';
    if (backendLabel) backendLabel.textContent = 'Error Conexión';
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  hideError();

  const content = messageContentInput ? messageContentInput.value.trim() : '';
  if (!content) {
    showError('El mensaje no puede estar vacío.');
    return;
  }

  try {
    isSending = true;
    if (btnSend) {
      btnSend.disabled = true;
      btnSend.querySelector('span').textContent = 'Enviando...';
    }

    await sendMessageApi({
      senderId: CURRENT_USER_ID,
      receiverId: TEACHER_USER_ID,
      content: content
    });

    if (messageContentInput) messageContentInput.value = '';
    if (charCountSpan) charCountSpan.textContent = '0';

    await loadConversation();
    showToast('Mensaje enviado al docente', '✉️');
  } catch (err) {
    showError(err.message);
  } finally {
    isSending = false;
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.querySelector('span').textContent = 'Enviar';
    }
  }
}

// ============================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================
function init() {
  // Navigation
  setupNavigation();

  // Chat events
  if (messageContentInput) {
    messageContentInput.addEventListener('input', () => {
      if (charCountSpan) charCountSpan.textContent = messageContentInput.value.length;
    });

    messageContentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        messageForm?.requestSubmit();
      }
    });
  }

  if (messageForm) messageForm.addEventListener('submit', handleSendMessage);
  if (btnCloseAlert) btnCloseAlert.addEventListener('click', hideError);

  // Grade events
  const btnOpenGradeModal = document.getElementById('btn-open-grade-modal');
  const btnCloseGradeModal = document.getElementById('btn-close-grade-modal');
  const btnCancelGradeModal = document.getElementById('btn-cancel-grade-modal');
  const formAddGrade = document.getElementById('form-add-grade');
  const filterGradeSearch = document.getElementById('filter-grade-search');
  const filterGradeSubject = document.getElementById('filter-grade-subject');

  if (btnOpenGradeModal) btnOpenGradeModal.addEventListener('click', openGradeModal);
  if (btnCloseGradeModal) btnCloseGradeModal.addEventListener('click', closeGradeModal);
  if (btnCancelGradeModal) btnCancelGradeModal.addEventListener('click', closeGradeModal);
  if (formAddGrade) formAddGrade.addEventListener('submit', handleAddGradeSubmit);
  if (filterGradeSearch) filterGradeSearch.addEventListener('input', renderGrades);
  if (filterGradeSubject) filterGradeSubject.addEventListener('change', renderGrades);

  // Modal backdrop click close
  const modalGrade = document.getElementById('modal-grade');
  if (modalGrade) {
    modalGrade.addEventListener('click', (e) => {
      if (e.target === modalGrade) closeGradeModal();
    });
  }

  // Attendance events
  const formRegisterAtt = document.getElementById('form-register-attendance');
  const attDateInput = document.getElementById('att-input-date');
  if (attDateInput) attDateInput.value = new Date().toISOString().split('T')[0];
  if (formRegisterAtt) formRegisterAtt.addEventListener('submit', handleAddAttendanceSubmit);

  // Attendance filter tabs
  const attFilterTabs = document.getElementById('att-filter-tabs');
  if (attFilterTabs) {
    attFilterTabs.querySelectorAll('.tab-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        attFilterTabs.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentAttendanceFilter = pill.getAttribute('data-att-filter') || 'all';
        renderAttendance();
      });
    });
  }

  // Notification events
  const btnMarkAllRead = document.getElementById('btn-mark-all-read');
  const btnSimulateNotif = document.getElementById('btn-simulate-notif');
  const btnClearReadNotif = document.getElementById('btn-clear-read-notif');
  const notifFilterTabs = document.getElementById('notif-filter-tabs');

  if (btnMarkAllRead) btnMarkAllRead.addEventListener('click', markAllNotificationsRead);
  if (btnSimulateNotif) btnSimulateNotif.addEventListener('click', simulateRandomNotification);
  if (btnClearReadNotif) btnClearReadNotif.addEventListener('click', clearReadNotifications);

  if (notifFilterTabs) {
    notifFilterTabs.querySelectorAll('.tab-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        notifFilterTabs.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentNotifFilter = pill.getAttribute('data-notif-filter') || 'all';
        renderNotifications();
      });
    });
  }

  // Dashboard notes form
  const formAddNote = document.getElementById('form-add-note');
  if (formAddNote) formAddNote.addEventListener('submit', handleAddNote);

  // Initial renders
  renderGrades();
  renderAttendance();
  renderNotifications();
  updateDashboard();
  updateBackendStatus();
  loadConversation();

  // Background sync for backend messages
  setInterval(() => {
    if (!isSending && currentView === 'mensajeria') {
      loadConversation();
      updateBackendStatus();
    }
  }, 5000);
}

// Start application
init();
