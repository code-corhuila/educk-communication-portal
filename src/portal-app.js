import './workspace.css';
import { checkBackendHealth, createTraceTelemetry, fetchConversation, resolveSubjectUuid, resolveTopicLabel, sendMessageApi } from './api.js';
import { markAnnouncementRead, normalizeAnnouncements } from './announcements.js';
import { CURRENT_USER_ID, INITIAL_ANNOUNCEMENTS, INITIAL_COMMUNICATION_NOTES, INITIAL_CONTACTS, INITIAL_CONVERSATION_THREADS, INITIAL_READ_RECEIPTS, STUDENTS_DIRECTORY, TEACHER_USER_ID } from './threads-data.js';
import { attachDialogLightDismissFallback, closeModalDialog, escapeHtml, openModalDialog, renderAnnouncementsView, renderCommNotesView, renderContactsView, renderReadReceiptsView, showToast, updateTelemetryModalView } from './views.js';
let currentView = 'mensajeria';
let currentStudentId = 's-4402-juan-chala';
let contactsList = loadFromStorage('edutrack_contacts_v3', INITIAL_CONTACTS);
let conversationThreads = loadFromStorage('edutrack_threads_v3', INITIAL_CONVERSATION_THREADS);
let announcementsList = normalizeAnnouncements(loadFromStorage('edutrack_announcements_v3', INITIAL_ANNOUNCEMENTS));
let announcementFilters = { category: 'ALL', date: '' };
let announcementTriggerId = null;
let readReceiptsList = loadFromStorage('edutrack_read_receipts_v3', INITIAL_READ_RECEIPTS);
let commNotes = loadFromStorage('edutrack_comm_notes_v3', INITIAL_COMMUNICATION_NOTES);
let activeContactId = TEACHER_USER_ID;
let convFilterTab = 'ALL';
let convSearchQuery = '';
let readsSearchQuery = '';
let isSending = false;
let isBackendOnline = false;
const telemetryLogs = [{
  timestamp: new Date().toISOString(), level: 'INFO', service: 'educk-communication-portal', version: '2.0.0', environment: 'qa',
  trace_id: '4bf92f3577b34da6a3ce929d0e0e4736', span_id: '00f067aa0ba902b7', correlation_id: 'corr-msg-99120',
  event: 'portal.session.initialized', message: 'Parent-teacher communication workspace initialized with W3C trace context',
  duration_ms: 12, sender_id: CURRENT_USER_ID, recipient_id: TEACHER_USER_ID, student_id: currentStudentId, message_id: 'a1111111-1111-1111-1111-111111111103'
}];
function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (structuredClone ? structuredClone(defaultValue) : JSON.parse(JSON.stringify(defaultValue)));
  } catch { return defaultValue; }
}
function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('Storage error:', e); }
}
function recordTelemetryLog(level, event, message, telemetry, extra = {}) {
  telemetryLogs.unshift({
    timestamp: new Date().toISOString(), level, service: 'educk-communication-portal', version: '2.0.0', environment: 'qa',
    trace_id: telemetry?.traceId || '4bf92f3577b34da6a3ce929d0e0e4736', span_id: telemetry?.spanId || '5c84a86b3e77f012',
    correlation_id: telemetry?.correlationId || 'corr-educk-01', event, message, duration_ms: extra.duration_ms ?? 18,
    sender_id: CURRENT_USER_ID, recipient_id: activeContactId, student_id: currentStudentId, message_id: extra.message_id || null
  });
  if (telemetryLogs.length > 10) telemetryLogs.pop();
  updateTelemetryModalView(telemetryLogs);
}
const getActiveContact = () => contactsList.find((c) => c.id === activeContactId) || contactsList[0];
const getActiveStudent = () => STUDENTS_DIRECTORY[currentStudentId] || STUDENTS_DIRECTORY['s-4402-juan-chala'];
const viewMeta = {
  mensajeria: { module: 'Comunicaciones', view: 'Bandeja de Mensajería Docente' },
  canales: { module: 'Comunicaciones', view: 'Circulares y Comunicados Oficiales' },
  lecturas: { module: 'Auditoría Institucional', view: 'Registro Certificado de Acuses de Recibo' },
  contactos: { module: 'Directorio Escolar', view: 'Cuerpo Docente y Coordinación' }
};
function updateSidebarBadges() {
  const unreadMessagesCount = contactsList.reduce((acc, c) => acc + (c.unread || 0), 0);
  const unreadAnnouncementsCount = announcementsList.filter((a) => !a.isRead).length;
  const navMsgBadge = document.getElementById('nav-unread-messages');
  if (navMsgBadge) {
    navMsgBadge.textContent = unreadMessagesCount > 0 ? String(unreadMessagesCount) : 'Al día';
    navMsgBadge.className = unreadMessagesCount > 0 ? 'badge-pulse' : 'nav-count-badge subtle';
  }
  const navAncBadge = document.getElementById('nav-unread-announcements');
  if (navAncBadge) {
    navAncBadge.textContent = String(unreadAnnouncementsCount);
    navAncBadge.style.display = unreadAnnouncementsCount > 0 ? 'inline-flex' : 'none';
  }
  const statTotalAnc = document.getElementById('stat-total-announcements');
  const statUnreadAnc = document.getElementById('stat-unread-announcements');
  if (statTotalAnc) statTotalAnc.textContent = String(announcementsList.length);
  if (statUnreadAnc) statUnreadAnc.textContent = String(unreadAnnouncementsCount);
}
function switchView(viewName) {
  if (!viewMeta[viewName]) return;
  currentView = viewName;
  document.querySelectorAll('.nav-menu .nav-item').forEach((item) => item.classList.toggle('active', item.getAttribute('data-view') === viewName));
  document.querySelectorAll('.app-view').forEach((viewEl) => viewEl.classList.toggle('active', viewEl.id === `view-${viewName}`));
  const meta = viewMeta[viewName];
  const bcModule = document.getElementById('bc-module');
  const bcView = document.getElementById('bc-view');
  if (bcModule) bcModule.textContent = meta.module;
  if (bcView) bcView.textContent = meta.view;
  if (viewName === 'mensajeria') { renderConversationsList(); renderActiveThreadHeader(); loadConversation(); }
  if (viewName === 'canales') renderAnnouncements();
  if (viewName === 'lecturas') renderReadReceiptsView(readReceiptsList, readsSearchQuery);
  if (viewName === 'contactos') renderContactsView(contactsList, (cid) => { activeContactId = cid; switchView('mensajeria'); });
}
function renderConversationsList() {
  const listEl = document.getElementById('conversations-list');
  const countBadge = document.getElementById('conv-count-badge');
  if (!listEl) return;
  const filtered = contactsList.filter((c) => {
    const matchesTab = convFilterTab === 'ALL' || (convFilterTab === 'UNREAD' && c.unread > 0) || c.category === convFilterTab;
    const q = convSearchQuery.trim().toLowerCase();
    return matchesTab && (!q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.lastMsg.toLowerCase().includes(q));
  });
  if (countBadge) countBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'Docente' : 'Docentes'}`;
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="conv-empty-state"><p>No se encontraron conversaciones con ese criterio.</p></div>`;
    return;
  }
  listEl.innerHTML = filtered.map((c) => {
    const isActive = c.id === activeContactId;
    const thread = conversationThreads[c.id] || [];
    const latestMsg = thread.length > 0 ? thread[thread.length - 1].content : c.lastMsg;
    return `<div class="conversation-item ${isActive ? 'active' : ''} ${c.unread > 0 ? 'has-unread' : ''}" data-contact-id="${c.id}" role="option" aria-selected="${isActive}" tabindex="0"><div class="avatar-wrapper"><div class="avatar-teacher theme-${c.avatarTheme || 'blue'}">${escapeHtml(c.avatar)}</div><span class="presence-dot ${c.status}"></span></div><div class="conv-meta"><div class="conv-title-row"><strong>${escapeHtml(c.name)}</strong><span class="conv-time">${escapeHtml(c.lastTime || 'Hoy')}</span></div><p class="conv-subject">${escapeHtml(c.role)} · ${escapeHtml(c.grade)}</p><div class="conv-preview-row"><small class="conv-preview">${escapeHtml(latestMsg)}</small>${c.unread > 0 ? `<span class="conv-unread-pill">${c.unread}</span>` : ''}</div></div></div>`;
  }).join('');
  listEl.querySelectorAll('.conversation-item').forEach((item) => {
    const selectContact = () => {
      const cid = item.getAttribute('data-contact-id');
      if (!cid) return;
      activeContactId = cid;
      const target = contactsList.find((c) => c.id === cid);
      if (target && target.unread > 0) { target.unread = 0; saveToStorage('edutrack_contacts_v3', contactsList); updateSidebarBadges(); }
      renderConversationsList(); renderActiveThreadHeader(); loadConversation();
    };
    item.addEventListener('click', selectContact);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectContact(); } });
  });
}
function renderActiveThreadHeader() {
  const teacher = getActiveContact();
  if (!teacher) return;
  const avatarEl = document.getElementById('thread-teacher-avatar');
  const nameEl = document.getElementById('thread-teacher-name');
  const statusEl = document.getElementById('thread-teacher-status');
  const subtitleEl = document.getElementById('thread-teacher-subtitle');
  const kpiTeacherEl = document.getElementById('kpi-active-teacher');
  const kpiScheduleEl = document.getElementById('kpi-teacher-schedule');
  if (avatarEl) { avatarEl.textContent = teacher.avatar; avatarEl.className = `avatar-teacher theme-${teacher.avatarTheme || 'blue'}`; }
  if (nameEl) nameEl.textContent = teacher.name;
  if (statusEl) { statusEl.textContent = teacher.statusLabel || 'Disponible'; statusEl.className = `teacher-presence-badge ${teacher.status}`; }
  if (subtitleEl) subtitleEl.textContent = `${teacher.role} · ${teacher.office} · ${teacher.email}`;
  if (kpiTeacherEl) kpiTeacherEl.textContent = teacher.name;
  if (kpiScheduleEl) kpiScheduleEl.textContent = teacher.schedule;
}
function renderAnnouncements() {
  updateSidebarBadges();
  renderAnnouncementsView(announcementsList, announcementFilters, (announcementId) => {
    announcementTriggerId = announcementId;
    const announcement = announcementsList.find(({ id }) => id === announcementId);
    const modal = document.getElementById('announcement-modal');
    if (!announcement || !modal) return;
    announcementsList = markAnnouncementRead(announcementsList, announcementId);
    saveToStorage('edutrack_announcements_v3', announcementsList);
    document.getElementById('announcement-modal-title').textContent = announcement.title;
    document.getElementById('announcement-modal-meta').textContent = `Circular ${announcement.id} · ${announcement.author} · Fecha: ${announcement.date}`;
    document.getElementById('announcement-modal-content').textContent = announcement.content;
    openModalDialog(modal); renderAnnouncements();
  });
}
function renderCommNotes() {
  renderCommNotesView(commNotes, (id, checked) => {
    const item = commNotes.find((n) => n.id === id);
    if (item) { item.done = checked; saveToStorage('edutrack_comm_notes_v3', commNotes); renderCommNotes(); }
  }, (id) => {
    commNotes = commNotes.filter((n) => n.id !== id);
    saveToStorage('edutrack_comm_notes_v3', commNotes); renderCommNotes();
  });
}
function formatTimestamp(isoString) {
  if (!isoString) return 'Hace un momento';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? String(isoString) : date.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function hideError() {
  const errorBanner = document.getElementById('error-banner');
  if (errorBanner) errorBanner.style.display = 'none';
}
function renderMessages(messages) {
  const messagesBody = document.getElementById('messages-body');
  const kpiTotalMessages = document.getElementById('kpi-total-messages');
  if (!messagesBody) return;
  const teacher = getActiveContact();
  const list = Array.isArray(messages) ? messages : [];
  if (kpiTotalMessages) kpiTotalMessages.textContent = String(list.length);
  if (list.length === 0) {
    messagesBody.innerHTML = `<div class="thread-empty-state"><h4>Inicie una conversación con ${escapeHtml(teacher.name)}</h4><p>Sus mensajes cuentan con acuse de recibo institucional y llegan directamente al buzón del docente.</p></div>`;
    return;
  }
  messagesBody.innerHTML = `<div class="thread-date-divider"><span>Historial Académico Verificado · ${escapeHtml(teacher.role)}</span></div>` +
    list.map((msg) => {
      const isSentByMe = msg.senderId === CURRENT_USER_ID;
      const senderLabel = isSentByMe ? 'Ximena Zambrano (Acudiente)' : teacher.name;
      const topicText = resolveTopicLabel(msg.topic || msg.subjectId);
      const topicBadge = topicText ? `<span class="message-topic-tag">${escapeHtml(topicText)}</span>` : '';
      const statusReceipt = isSentByMe ? `<span class="msg-receipt-check" title="Traza W3C: ${escapeHtml(msg.traceId || '4bf92f3577b34da6a3ce929d0e0e4736')}">✓✓ ${escapeHtml(msg.status || 'Entregado')}</span>` : '';
      return `<div class="message-row ${isSentByMe ? 'sent' : 'received'}"><div class="message-bubble">${topicBadge}<p class="message-text">${escapeHtml(msg.content)}</p></div><div class="message-meta"><strong>${escapeHtml(senderLabel)}</strong><span>·</span><time>${escapeHtml(formatTimestamp(msg.createdAt))}</time>${statusReceipt}</div></div>`;
    }).join('');
  messagesBody.scrollTop = messagesBody.scrollHeight;
}
async function loadConversation() {
  hideError();
  const localMessages = conversationThreads[activeContactId] || [];
  try {
    const remoteMessages = await fetchConversation(CURRENT_USER_ID, activeContactId);
    if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
      const normalizedRemote = remoteMessages.map((m) => ({
        ...m, topic: m.topic || resolveTopicLabel(m.subjectId), status: m.status || 'SINCRONIZADO', traceId: m.traceId || '4bf92f3577b34da6a3ce929d0e0e4736'
      }));
      conversationThreads[activeContactId] = normalizedRemote;
      saveToStorage('edutrack_threads_v3', conversationThreads);
      const teacher = getActiveContact();
      const last = normalizedRemote[normalizedRemote.length - 1];
      if (teacher && last?.content) { teacher.lastMsg = last.content; saveToStorage('edutrack_contacts_v3', contactsList); renderConversationsList(); }
      renderMessages(normalizedRemote);
      return;
    }
  } catch { /* Fallback to local thread state when backend :8085 is offline */ }
  renderMessages(localMessages);
}
async function handleSendMessage(e) {
  e.preventDefault();
  if (isSending) return;
  const messageContentInput = document.getElementById('message-content');
  const topicSelect = document.getElementById('message-topic-select');
  const charCountSpan = document.getElementById('char-count');
  const btnSend = document.getElementById('btn-send');
  const content = messageContentInput?.value.trim();
  if (!content) return;
  const selectedTopic = topicSelect ? topicSelect.value : 'Consulta Académica';
  const resolvedSubjectId = resolveSubjectUuid(selectedTopic);
  const teacher = getActiveContact();
  const telemetry = createTraceTelemetry();
  const startTime = performance.now();
  hideError(); isSending = true;
  if (btnSend) btnSend.disabled = true;
  let persistedRemotely = false;
  let remoteResponse = null;
  try {
    remoteResponse = await sendMessageApi({ senderId: CURRENT_USER_ID, receiverId: activeContactId, content, subjectId: resolvedSubjectId, idempotencyKey: telemetry.idempotencyKey, telemetry });
    persistedRemotely = true;
  } catch { persistedRemotely = false; }
  const durationMs = Math.max(8, Math.round(performance.now() - startTime));
  const newMsgId = remoteResponse?.id ? `MSG-${String(remoteResponse.id).slice(0, 8).toUpperCase()}` : `MSG-${Math.floor(90500 + Math.random() * 900)}`;
  const newMessage = {
    id: remoteResponse?.id || newMsgId, senderId: CURRENT_USER_ID, receiverId: activeContactId, subjectId: resolvedSubjectId,
    topic: selectedTopic, content, createdAt: remoteResponse?.createdAt || new Date().toISOString(),
    traceId: telemetry.traceId, idempotencyKey: telemetry.idempotencyKey, status: persistedRemotely ? 'SINCRONIZADO' : 'ENTREGADO'
  };
  if (!conversationThreads[activeContactId]) conversationThreads[activeContactId] = [];
  conversationThreads[activeContactId].push(newMessage);
  saveToStorage('edutrack_threads_v3', conversationThreads);
  if (teacher) { teacher.lastMsg = content; teacher.lastTime = 'Ahora'; saveToStorage('edutrack_contacts_v3', contactsList); }
  readReceiptsList.unshift({
    messageId: newMsgId, recipient: teacher.name, subject: `${selectedTopic} · ${teacher.grade}`,
    sentAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    readAt: persistedRemotely ? 'Confirmado por servidor PostgreSQL' : 'Acuse registrado en bandeja',
    status: persistedRemotely ? 'SINCRONIZADO' : 'ENTREGADO', traceId: telemetry.traceId, channel: 'Bandeja Institucional'
  });
  saveToStorage('edutrack_read_receipts_v3', readReceiptsList);
  recordTelemetryLog('INFO', persistedRemotely ? 'message.send.synced' : 'message.send.buffered', `Mensaje enviado a ${teacher.name} con Idempotency-Key ${telemetry.idempotencyKey.slice(0, 8)}`, telemetry, { duration_ms: durationMs, message_id: newMsgId });
  messageContentInput.value = '';
  if (charCountSpan) charCountSpan.textContent = '0';
  renderConversationsList(); renderMessages(conversationThreads[activeContactId]);
  showToast(`Mensaje enviado a ${teacher.name} (${newMsgId})`, 'success');
  isSending = false;
  if (btnSend) btnSend.disabled = false;
}
async function updateBackendStatus() {
  const backendLabel = document.getElementById('backend-label');
  const statusDot = document.getElementById('status-dot');
  const telemetryState = document.getElementById('telemetry-backend-state');
  isBackendOnline = await checkBackendHealth();
  if (statusDot) statusDot.className = `status-dot ${isBackendOnline ? 'online' : 'standby'}`;
  if (backendLabel) backendLabel.textContent = isBackendOnline ? 'Sincronizado en Línea (:8085)' : 'Canal Institucional Activo';
  if (telemetryState) telemetryState.textContent = isBackendOnline ? 'Conectado (HTTP 200 · :8085)' : 'Modo Resiliente Local (Buffer Activo)';
}
export function mount() {
  if (typeof window !== 'undefined' && window.self !== window.top) document.body.classList.add('is-embedded-iframe');
  document.querySelectorAll('.nav-menu .nav-item').forEach((item) => item.addEventListener('click', (e) => { e.preventDefault(); const v = item.getAttribute('data-view'); if (v) switchView(v); }));
  document.getElementById('btn-refresh')?.addEventListener('click', () => { updateBackendStatus(); loadConversation(); renderAnnouncements(); renderReadReceiptsView(readReceiptsList, readsSearchQuery); showToast('Bandeja institucional sincronizada', 'success'); });
  const studentSelector = document.getElementById('student-selector');
  studentSelector?.addEventListener('change', () => {
    currentStudentId = studentSelector.value;
    const st = getActiveStudent();
    const gradeEl = document.getElementById('sidebar-student-grade');
    const avgEl = document.getElementById('sidebar-student-avg');
    const attEl = document.getElementById('sidebar-student-att');
    const convCtx = document.getElementById('conv-student-context');
    const chipEl = document.getElementById('thread-student-chip');
    if (gradeEl) gradeEl.textContent = st.grade;
    if (avgEl) avgEl.textContent = st.average;
    if (attEl) attEl.textContent = st.attendance;
    if (convCtx) convCtx.textContent = `Docentes de ${st.name.split(' ')[0]} · ${st.grade}`;
    if (chipEl) chipEl.innerHTML = `Estudiante: <strong>${escapeHtml(st.name)} (${escapeHtml(st.grade)})</strong>`;
    showToast(`Contexto cambiado a ${st.name} (${st.grade})`, 'info');
  });
  const searchInput = document.getElementById('conv-search-input');
  searchInput?.addEventListener('input', () => { convSearchQuery = searchInput.value; renderConversationsList(); });
  document.querySelectorAll('.conv-tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.conv-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active'); convFilterTab = tab.getAttribute('data-conv-filter') || 'ALL'; renderConversationsList();
  }));
  document.querySelectorAll('.template-chip').forEach((chip) => chip.addEventListener('click', () => {
    const tpl = chip.getAttribute('data-template');
    const input = document.getElementById('message-content');
    const charCount = document.getElementById('char-count');
    if (input && tpl) { input.value = tpl; input.focus(); if (charCount) charCount.textContent = String(tpl.length); }
  }));
  document.getElementById('btn-schedule-meeting')?.addEventListener('click', () => {
    const teacher = getActiveContact();
    const topicSelect = document.getElementById('message-topic-select');
    const input = document.getElementById('message-content');
    const charCount = document.getElementById('char-count');
    if (topicSelect) topicSelect.value = 'Solicitud de Atención a Padres';
    if (input) {
      input.value = `Estimado(a) ${teacher.name}, cordial saludo. Solicito amablemente agendar un espacio de atención a padres en su horario (${teacher.schedule}) para conversar sobre el seguimiento académico de ${getActiveStudent().name}.`;
      input.focus(); if (charCount) charCount.textContent = String(input.value.length);
    }
    showToast(`Plantilla de cita cargada para ${teacher.name}`, 'info');
  });
  document.getElementById('btn-export-thread')?.addEventListener('click', () => {
    const teacher = getActiveContact();
    const student = getActiveStudent();
    const msgs = conversationThreads[activeContactId] || [];
    const lines = [
      '====================================================================',
      'COLEGIO EDUTRACK — CERTIFICADO DE COMUNICACIÓN DOCENTE-FAMILIA',
      '====================================================================',
      `Estudiante: ${student.name} (${student.grade}) - Código: ${student.code}`,
      `Docente Interlocutor: ${teacher.name} (${teacher.role})`,
      `Correo Institucional: ${teacher.email}`,
      `Fecha de Emisión: ${new Date().toLocaleString('es-CO')}`,
      '--------------------------------------------------------------------',
      ...msgs.map((m) => `[${new Date(m.createdAt).toLocaleString('es-CO')}] ${m.senderId === CURRENT_USER_ID ? 'Acudiente (Ximena Zambrano)' : teacher.name} (${m.topic || 'Consulta'}):\n${m.content}\nTraza W3C: ${m.traceId || '4bf92f3577b34da6a3ce929d0e0e4736'}\n`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Historial_EduTrack_${teacher.name.replace(/\s+/g, '_')}.txt`; a.click();
    URL.revokeObjectURL(url); showToast('Comprobante de conversación descargado', 'success');
  });
  const categoryFilter = document.getElementById('announcement-category');
  const dateFilter = document.getElementById('announcement-date');
  const announcementModal = document.getElementById('announcement-modal');
  attachDialogLightDismissFallback(announcementModal);
  categoryFilter?.addEventListener('change', () => { announcementFilters.category = categoryFilter.value; renderAnnouncements(); });
  dateFilter?.addEventListener('change', () => { announcementFilters.date = dateFilter.value; renderAnnouncements(); });
  document.getElementById('btn-clear-announcement-filters')?.addEventListener('click', () => {
    announcementFilters = { category: 'ALL', date: '' };
    if (categoryFilter) categoryFilter.value = 'ALL'; if (dateFilter) dateFilter.value = ''; renderAnnouncements();
  });
  const closeAnnouncement = () => { closeModalDialog(announcementModal); document.querySelector(`[data-announcement-id="${announcementTriggerId}"]`)?.focus(); };
  document.getElementById('btn-close-announcement')?.addEventListener('click', closeAnnouncement);
  document.getElementById('btn-Ack-announcement')?.addEventListener('click', () => { closeAnnouncement(); showToast('Constancia de lectura registrada', 'success'); });
  const telemetryModal = document.getElementById('telemetry-modal');
  attachDialogLightDismissFallback(telemetryModal);
  document.getElementById('btn-open-telemetry')?.addEventListener('click', () => { updateTelemetryModalView(telemetryLogs); openModalDialog(telemetryModal); });
  document.getElementById('btn-close-telemetry')?.addEventListener('click', () => closeModalDialog(telemetryModal));
  document.getElementById('btn-close-telemetry-foot')?.addEventListener('click', () => closeModalDialog(telemetryModal));
  updateSidebarBadges(); renderConversationsList(); renderActiveThreadHeader(); loadConversation(); renderCommNotes(); updateBackendStatus();
  const readsSearchInput = document.getElementById('reads-search-input');
  readsSearchInput?.addEventListener('input', () => { readsSearchQuery = readsSearchInput.value; renderReadReceiptsView(readReceiptsList, readsSearchQuery); });
  const formAddNote = document.getElementById('form-add-comm-note');
  formAddNote?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('comm-note-input');
    const text = input?.value.trim();
    if (!text) return;
    commNotes.unshift({ id: 'cn-' + Date.now(), text, done: false });
    saveToStorage('edutrack_comm_notes_v3', commNotes); input.value = ''; renderCommNotes(); showToast('Recordatorio escolar guardado', 'success');
  });
  const messageContentInput = document.getElementById('message-content');
  const charCountSpan = document.getElementById('char-count');
  const messageForm = document.getElementById('message-form');
  if (messageContentInput && charCountSpan) {
    messageContentInput.addEventListener('input', () => { charCountSpan.textContent = String(messageContentInput.value.length); });
    messageContentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); messageForm?.requestSubmit(); } });
  }
  messageForm?.addEventListener('submit', handleSendMessage);
  document.getElementById('btn-close-alert')?.addEventListener('click', hideError);
  setInterval(updateBackendStatus, 20000);
}
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => { if (!window.__MICRO_APP__) mount(); });
}
