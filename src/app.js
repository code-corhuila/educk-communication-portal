import { checkBackendHealth, fetchConversation, sendMessageApi } from './api.js';
import { ANNOUNCEMENT_CATEGORIES, filterAnnouncements, markAnnouncementRead, normalizeAnnouncements } from './announcements.js';

// ============================================================
// CONSTANTS & INITIAL DATA (Strictly Communication Domain)
// ============================================================
const CURRENT_USER_ID = '11111111-1111-1111-1111-111111111111'; // Ximena Zambrano (Padre de Familia)
const TEACHER_USER_ID = '22222222-2222-2222-2222-222222222222'; // Prof. Carlos Mendoza (Matemáticas)

const INITIAL_CONTACTS = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Prof. Carlos Mendoza', role: 'Docente Matemáticas', avatar: 'CM', status: 'online', unread: 0, lastMsg: 'Con gusto, quedo atento a cualquier duda.' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Prof. Laura Morales', role: 'Docente Física', avatar: 'LM', status: 'offline', unread: 1, lastMsg: 'Próxima entrega de laboratorio el viernes.' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Prof. María Rodríguez', role: 'Docente Lenguaje', avatar: 'MR', status: 'online', unread: 0, lastMsg: 'Excelente avance en comprensión lectora.' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Coord. Académico Juan Pérez', role: 'Coordinación 10-A', avatar: 'JP', status: 'away', unread: 0, lastMsg: 'Reunión general de padres programada.' }
];

const INITIAL_ANNOUNCEMENTS = [
  { id: 'anc-1', title: 'Entrega de Informes del Primer Corte', author: 'Rectoría Institucional', date: '2026-09-18', category: 'URGENT', content: 'Estimados padres de familia y acudientes: El próximo viernes 25 de septiembre se realizará la jornada virtual de entrega de reportes del primer corte académico.', isRead: false },
  { id: 'anc-2', title: 'Convocatoria al Comité de Convivencia', author: 'Coordinación de Convivencia', date: '2026-09-15', category: 'GENERAL', content: 'Invitación a los representantes de curso para la sesión ordinaria mensual el miércoles a las 04:00 PM.', isRead: false },
  { id: 'anc-3', title: 'Jornada Cultural y Científica 2026', author: 'Comité Académico', date: '2026-09-10', category: 'ACADEMIC', content: 'Inscripciones abiertas para la muestra de proyectos de ciencia y robótica de estudiantes de bachillerato.', isRead: true }
];

const INITIAL_READ_RECEIPTS = [
  { messageId: 'msg-rec-101', recipient: 'Prof. Carlos Mendoza', sentAt: '2026-09-19 14:30', readAt: '2026-09-19 14:32', status: 'LEÍDO', channel: 'Directo' },
  { messageId: 'msg-rec-102', recipient: 'Prof. Laura Morales', sentAt: '2026-09-18 10:15', readAt: '2026-09-18 11:00', status: 'LEÍDO', channel: 'Directo' },
  { messageId: 'msg-rec-103', recipient: 'Coord. Académico Juan Pérez', sentAt: '2026-09-17 16:45', readAt: 'Pendiente', status: 'ENTREGADO', channel: 'Directo' }
];

const INITIAL_COMMUNICATION_NOTES = [
  { id: 'cn-1', text: 'Solicitar cita virtual con Prof. Carlos sobre dudas de álgebra', done: true },
  { id: 'cn-2', text: 'Confirmar recepción de circular informativa de rectoría', done: false }
];

// ============================================================
// STATE MANAGEMENT (LocalStorage)
// ============================================================
let currentView = 'mensajeria';
let contactsList = loadFromStorage('edutrack_contacts', INITIAL_CONTACTS);
let announcementsList = normalizeAnnouncements(loadFromStorage('edutrack_announcements', INITIAL_ANNOUNCEMENTS));
let announcementFilters = { category: 'ALL', date: '' };
let announcementTriggerId = null;
let readReceiptsList = loadFromStorage('edutrack_read_receipts', INITIAL_READ_RECEIPTS);
let commNotes = loadFromStorage('edutrack_comm_notes', INITIAL_COMMUNICATION_NOTES);
let activeContactId = TEACHER_USER_ID;
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
  mensajeria: { module: 'Comunicación', view: 'Chat Padre-Profesor (HU-004)' },
  canales: { module: 'Comunicación', view: 'Canales y Comunicados Institucionales' },
  lecturas: { module: 'Auditoría', view: 'Confirmaciones de Lectura (message_reads)' },
  contactos: { module: 'Directorio', view: 'Contactos Institucionales' }
};

function switchView(viewName) {
  if (!viewMeta[viewName]) return;
  currentView = viewName;

  // Update nav items
  document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update views
  document.querySelectorAll('.app-view').forEach(viewEl => {
    if (viewEl.id === `view-${viewName}`) {
      viewEl.classList.add('active');
    } else {
      viewEl.classList.remove('active');
    }
  });

  // Update breadcrumb
  const meta = viewMeta[viewName];
  const bcModule = document.getElementById('bc-module');
  const bcView = document.getElementById('bc-view');
  if (bcModule) bcModule.textContent = meta.module;
  if (bcView) bcView.textContent = meta.view;

  // Update topbar actions
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
    } else if (viewName === 'canales') {
      topbarActions.innerHTML = `
        <button id="btn-sync-channels" class="btn btn-secondary" title="Actualizar circulares">
          ⚡ Sincronizar Canales
        </button>
      `;
      const btnSync = document.getElementById('btn-sync-channels');
      if (btnSync) {
        btnSync.addEventListener('click', () => {
          renderAnnouncements();
          showToast('Comunicados sincronizados', '⚡');
        });
      }
    } else if (viewName === 'lecturas') {
      topbarActions.innerHTML = `
        <button id="btn-sync-reads" class="btn btn-secondary" title="Refrescar auditoría">
          🔍 Actualizar Lecturas
        </button>
      `;
      const btnSync = document.getElementById('btn-sync-reads');
      if (btnSync) {
        btnSync.addEventListener('click', () => {
          renderReadReceipts();
          showToast('Auditoría de lecturas actualizada', '🔍');
        });
      }
    }
  }

  // Refresh view contents
  if (viewName === 'canales') renderAnnouncements();
  if (viewName === 'lecturas') renderReadReceipts();
  if (viewName === 'contactos') renderContacts();
}

function setupNavigation() {
  document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      if (targetView) switchView(targetView);
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav-target]');
    if (btn) {
      const target = btn.getAttribute('data-nav-target');
      if (target) switchView(target);
    }
  });
}

// ============================================================
// CHANNELS & ANNOUNCEMENTS MODULE
// ============================================================
function renderAnnouncements() {
  const container = document.getElementById('announcements-container');
  if (!container) return;

  const filteredAnnouncements = filterAnnouncements(announcementsList, announcementFilters);

  if (filteredAnnouncements.length === 0) {
    container.innerHTML = `
      <div class="announcement-empty" role="status">
        📢 No hay comunicados que coincidan con los filtros seleccionados.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredAnnouncements.map(a => `
    <article class="card-box announcement-card ${a.isRead ? 'is-read' : ''}">
      <div class="card-box-header">
        <div>
          <span class="badge-tag ${a.category === 'URGENT' ? 'danger' : 'info'}">${escapeHtml(ANNOUNCEMENT_CATEGORIES[a.category] || ANNOUNCEMENT_CATEGORIES.GENERAL)}</span>
          <span class="badge-tag ${a.isRead ? 'pass' : 'unread'}">${a.isRead ? 'Leído' : 'Sin leer'}</span>
          <h3 class="announcement-title">${escapeHtml(a.title)}</h3>
        </div>
        <small style="color: var(--text-muted);">${escapeHtml(a.date)}</small>
      </div>
      <p class="announcement-preview">${escapeHtml(a.content)}</p>
      <div class="announcement-footer">
        <small style="color: var(--text-muted);">Publicado por: <strong>${escapeHtml(a.author)}</strong></small>
        <button class="btn btn-secondary btn-open-announcement" data-announcement-id="${a.id}" aria-label="Leer comunicado: ${escapeHtml(a.title)}">
          Leer comunicado
        </button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.btn-open-announcement').forEach(button => {
    button.addEventListener('click', () => {
      announcementTriggerId = button.dataset.announcementId;
      openAnnouncement(button.dataset.announcementId);
    });
  });
}

function openAnnouncement(announcementId) {
  const announcement = announcementsList.find(({ id }) => id === announcementId);
  const modal = document.getElementById('announcement-modal');
  if (!announcement || !modal) return;

  announcementsList = markAnnouncementRead(announcementsList, announcementId);
  saveToStorage('edutrack_announcements', announcementsList);
  document.getElementById('announcement-modal-title').textContent = announcement.title;
  document.getElementById('announcement-modal-meta').textContent = `${announcement.author} · ${announcement.date}`;
  document.getElementById('announcement-modal-content').textContent = announcement.content;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('btn-close-announcement').focus();
  renderAnnouncements();
}

function closeAnnouncement() {
  const modal = document.getElementById('announcement-modal');
  if (!modal?.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector(`[data-announcement-id="${announcementTriggerId}"]`)?.focus();
}

function setupAnnouncementControls() {
  const categoryFilter = document.getElementById('announcement-category');
  const dateFilter = document.getElementById('announcement-date');
  const clearButton = document.getElementById('btn-clear-announcement-filters');
  const modal = document.getElementById('announcement-modal');

  categoryFilter?.addEventListener('change', () => {
    announcementFilters.category = categoryFilter.value;
    renderAnnouncements();
  });
  dateFilter?.addEventListener('change', () => {
    announcementFilters.date = dateFilter.value;
    renderAnnouncements();
  });
  clearButton?.addEventListener('click', () => {
    announcementFilters = { category: 'ALL', date: '' };
    categoryFilter.value = 'ALL';
    dateFilter.value = '';
    renderAnnouncements();
  });
  document.getElementById('btn-close-announcement')?.addEventListener('click', closeAnnouncement);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeAnnouncement();
  });
  document.addEventListener('keydown', (event) => {
    if (!modal?.classList.contains('open')) return;
    if (event.key === 'Escape') closeAnnouncement();
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
        .filter((element) => !element.disabled && element.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  });
}

// ============================================================
// READ RECEIPTS AUDIT MODULE (message_reads)
// ============================================================
function renderReadReceipts() {
  const tbody = document.getElementById('reads-table-body');
  if (!tbody) return;

  tbody.innerHTML = readReceiptsList.map(r => `
    <tr>
      <td><code>${escapeHtml(r.messageId)}</code></td>
      <td><strong>${escapeHtml(r.recipient)}</strong></td>
      <td style="color: var(--text-muted);">${escapeHtml(r.sentAt)}</td>
      <td><span class="badge-tag ${r.status === 'LEÍDO' ? 'pass' : 'info'}">${escapeHtml(r.status)}</span></td>
      <td style="color: var(--text-muted);">${escapeHtml(r.readAt)}</td>
      <td><small style="color: var(--text-muted);">${escapeHtml(r.channel)}</small></td>
    </tr>
  `).join('');
}

// ============================================================
// CONTACTS DIRECTORY MODULE
// ============================================================
function renderContacts() {
  const container = document.getElementById('contacts-grid');
  if (!container) return;

  container.innerHTML = contactsList.map(c => `
    <div class="card-box contact-card" style="display: flex; gap: 14px; align-items: center;">
      <div class="student-avatar-big" style="width: 48px; height: 48px; font-size: 1rem;">${escapeHtml(c.avatar)}</div>
      <div style="flex: 1;">
        <h4 style="font-size: 0.95rem; margin-bottom: 2px;">${escapeHtml(c.name)}</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">${escapeHtml(c.role)}</p>
        <span class="badge-tag ${c.status === 'online' ? 'pass' : 'gray'}" style="font-size: 0.7rem;">● ${c.status}</span>
      </div>
      <button class="btn btn-primary btn-open-chat" data-contact-id="${c.id}" style="height: 36px; padding: 0 14px; font-size: 0.8rem;">
        💬 Chatear
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-open-chat').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-contact-id');
      activeContactId = cid;
      switchView('mensajeria');
      loadConversation();
    });
  });
}

// ============================================================
// NOTES & ACTION ITEMS
// ============================================================
function renderCommNotes() {
  const container = document.getElementById('comm-notes-list');
  if (!container) return;

  container.innerHTML = commNotes.map(n => `
    <div class="note-row ${n.done ? 'done' : ''}" data-note-id="${n.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px;">
      <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
        <input type="checkbox" class="chk-note" ${n.done ? 'checked' : ''}>
        <span style="${n.done ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(n.text)}</span>
      </label>
      <button class="btn-del-note" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.chk-note').forEach(chk => {
    chk.addEventListener('change', () => {
      const row = chk.closest('.note-row');
      const id = row.getAttribute('data-note-id');
      const item = commNotes.find(n => n.id === id);
      if (item) {
        item.done = chk.checked;
        saveToStorage('edutrack_comm_notes', commNotes);
        renderCommNotes();
      }
    });
  });

  container.querySelectorAll('.btn-del-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.note-row');
      const id = row.getAttribute('data-note-id');
      commNotes = commNotes.filter(n => n.id !== id);
      saveToStorage('edutrack_comm_notes', commNotes);
      renderCommNotes();
    });
  });
}

// ============================================================
// MENSAJERÍA DIRECTA PADRE-DOCENTE (LIVE BACKEND ON :8085)
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
        <span>${isSentByMe ? 'Tú (Acudiente)' : 'Prof. Carlos Mendoza'}</span>
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
    const messages = await fetchConversation(CURRENT_USER_ID, activeContactId);
    renderMessages(messages);
  } catch (err) {
    console.error('Error cargando conversación:', err);
    showError('No se pudo conectar con el microservicio: ' + err.message);
    if (messagesBody) {
      messagesBody.innerHTML = `
        <div class="chat-placeholder error-placeholder" style="text-align:center; padding: 2rem; color: #ef4444;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <p style="font-weight: 600; margin-bottom: 0.25rem;">Servicio de mensajería no disponible</p>
          <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 1rem;">No se pudieron cargar los mensajes desde el microservicio (${escapeHtml(err.message)}).</p>
          <button id="btn-retry-chat" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Reintentar conexión</button>
        </div>
      `;
      const btnRetry = document.getElementById('btn-retry-chat');
      if (btnRetry) {
        btnRetry.addEventListener('click', () => {
          messagesBody.innerHTML = `
            <div class="chat-placeholder">
              <div class="spinner"></div>
              <p>Reconectando con el microservicio...</p>
            </div>
          `;
          hideError();
          loadConversation();
        });
      }
    }
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  if (isSending) return;

  const content = messageContentInput.value.trim();
  if (!content) return;

  hideError();
  isSending = true;
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.textContent = 'Enviando...';
  }

  // Optimistic UI render
  const tempRow = document.createElement('div');
  tempRow.className = 'message-row sent';
  tempRow.innerHTML = `
    <div class="message-bubble" style="opacity: 0.8;">
      ${escapeHtml(content)}
    </div>
    <div class="message-meta">
      <span>Tú (Acudiente)</span>
      <span>•</span>
      <span>Enviando...</span>
      <span>⏳</span>
    </div>
  `;
  if (messagesBody) {
    messagesBody.appendChild(tempRow);
    messagesBody.scrollTop = messagesBody.scrollHeight;
  }

  try {
    const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'msg-key-' + Date.now();
    await sendMessageApi({
      senderId: CURRENT_USER_ID,
      receiverId: activeContactId,
      content: content,
      idempotencyKey
    });

    messageContentInput.value = '';
    if (charCountSpan) charCountSpan.textContent = '0/500';
    showToast('Mensaje entregado exitosamente', '✉️');

    // Reload conversation from server
    await loadConversation();
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    showError('Error enviando mensaje: ' + err.message);
    if (tempRow) {
      tempRow.querySelector('.message-meta').innerHTML = `
        <span style="color: #ef4444;">Error al enviar</span>
        <span>•</span>
        <button id="btn-resend" class="btn btn-outline" style="padding: 2px 6px; font-size: 0.75rem;">Reintentar</button>
      `;
      const btnResend = tempRow.querySelector('#btn-resend');
      if (btnResend) {
        btnResend.addEventListener('click', () => {
          messageContentInput.value = content;
          tempRow.remove();
          handleSendMessage(e);
        });
      }
    }
  } finally {
    isSending = false;
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `
        <span>Enviar</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
    }
  }
}

async function updateBackendStatus() {
  const isHealthy = await checkBackendHealth();
  if (backendStatusDot) {
    backendStatusDot.className = `status-dot ${isHealthy ? 'online' : 'offline'}`;
  }
  if (backendLabel) {
    backendLabel.textContent = isHealthy ? 'Conectado (8085)' : 'Sin conexión (8085)';
    backendLabel.style.color = isHealthy ? '#10b981' : '#ef4444';
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
export function mount() {
  setupNavigation();
  setupAnnouncementControls();
  updateBackendStatus();
  loadConversation();
  renderCommNotes();

  // Note add form
  const formAddNote = document.getElementById('form-add-comm-note');
  if (formAddNote) {
    formAddNote.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('comm-note-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      commNotes.unshift({ id: 'cn-' + Date.now(), text, done: false });
      saveToStorage('edutrack_comm_notes', commNotes);
      input.value = '';
      renderCommNotes();
      showToast('Nota de comunicación guardada', '📌');
    });
  }

  // Message character counter
  if (messageContentInput && charCountSpan) {
    messageContentInput.addEventListener('input', () => {
      const len = messageContentInput.value.length;
      charCountSpan.textContent = `${len}/500`;
      if (len > 500) {
        charCountSpan.style.color = 'var(--error-red)';
      } else {
        charCountSpan.style.color = 'var(--text-muted)';
      }
    });
  }

  // Message submit form
  if (messageForm) {
    messageForm.addEventListener('submit', handleSendMessage);
  }

  // Close error banner
  if (btnCloseAlert) {
    btnCloseAlert.addEventListener('click', hideError);
  }

  // Polling for backend health & new messages
  setInterval(updateBackendStatus, 15000);
  setInterval(() => {
    if (currentView === 'mensajeria' && !isSending) {
      loadConversation();
    }
  }, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  // If not running as a microfrontend, mount immediately
  if (!window.__MICRO_APP__) {
    mount();
  }
});
// Feature: Envío de Mensajes Directos con Bloqueo de Botón
