// Secondary views, native <dialog closedby="any"> helpers, and CP2 telemetry modal
import { ANNOUNCEMENT_CATEGORIES, filterAnnouncements } from './announcements.js';
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.innerHTML = `<span class="toast-indicator"></span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s, transform 0.25s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}
// Light-dismiss dialog helper (modern-web-guidance: light-dismiss-a-dialog)
export function attachDialogLightDismissFallback(dialog) {
  if (!dialog || typeof HTMLDialogElement === 'undefined') return;
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    });
  }
}
export function openModalDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}
export function closeModalDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}
export function renderAnnouncementsView(announcementsList, announcementFilters, onOpenAnnouncement) {
  const container = document.getElementById('announcements-container');
  if (!container) return;
  const filtered = filterAnnouncements(announcementsList, announcementFilters);
  if (filtered.length === 0) {
    container.innerHTML = `<div class="announcement-empty" role="status">No hay circulares que coincidan con los filtros seleccionados.</div>`;
    return;
  }
  container.innerHTML = filtered
    .map(
      (a) => `
    <article class="card-box announcement-card ${a.isRead ? 'is-read' : ''}"><div class="card-box-header"><div class="announcement-header-meta"><div class="announcement-badges"><span class="badge-tag ${a.category === 'URGENT' ? 'danger' : a.category === 'ACADEMIC' ? 'info' : 'gray'}">
              ${escapeHtml(ANNOUNCEMENT_CATEGORIES[a.category] || ANNOUNCEMENT_CATEGORIES.GENERAL)}
            </span><span class="badge-tag ${a.isRead ? 'pass' : 'unread'}">
              ${a.isRead ? 'Lectura confirmada' : 'Pendiente de lectura'}
            </span><code class="circular-code">${escapeHtml(a.id)}</code></div><h3 class="announcement-title">${escapeHtml(a.title)}</h3></div><time class="announcement-date" datetime="${escapeHtml(a.date)}">${escapeHtml(a.date)}</time></div><p class="announcement-preview">${escapeHtml(a.content)}</p><div class="announcement-footer"><small class="announcement-author">Emitido por: <strong>${escapeHtml(a.author)}</strong></small><button class="btn btn-secondary btn-open-announcement" type="button" data-announcement-id="${a.id}" aria-label="Leer comunicado: ${escapeHtml(a.title)}">
          Abrir circular oficial
        </button></div></article>`
    )
    .join('');
  container.querySelectorAll('.btn-open-announcement').forEach((button) => {
    button.addEventListener('click', () => onOpenAnnouncement(button.dataset.announcementId));
  });
}
export function renderReadReceiptsView(readReceiptsList, readsSearchQuery) {
  const tbody = document.getElementById('reads-table-body');
  if (!tbody) return;
  const q = readsSearchQuery.trim().toLowerCase();
  const filtered = readReceiptsList.filter(
    (r) =>
      !q ||
      r.messageId.toLowerCase().includes(q) ||
      r.recipient.toLowerCase().includes(q) ||
      (r.subject || '').toLowerCase().includes(q)
  );
  tbody.innerHTML = filtered
    .map(
      (r) => `
    <tr><td><code class="receipt-code">${escapeHtml(r.messageId)}</code></td><td><strong>${escapeHtml(r.recipient)}</strong></td><td>${escapeHtml(r.subject || 'Consulta Académica')}</td><td class="text-muted">${escapeHtml(r.sentAt)}</td><td><span class="badge-tag ${r.status === 'LEÍDO' || r.status === 'SINCRONIZADO' ? 'pass' : 'info'}">${escapeHtml(r.status)}</span></td><td class="text-muted">${escapeHtml(r.readAt)}</td><td><code class="trace-pill" title="W3C Trace ID">${escapeHtml((r.traceId || '4bf92f3577b34da6').slice(0, 12))}…</code></td></tr>`
    )
    .join('');
}
export function renderContactsView(contactsList, onSelectContact) {
  const container = document.getElementById('contacts-grid');
  if (!container) return;
  container.innerHTML = contactsList
    .map(
      (c) => `
    <article class="card-box contact-card"><div class="contact-card-top"><div class="avatar-teacher avatar-lg theme-${c.avatarTheme || 'blue'}">${escapeHtml(c.avatar)}</div><div class="contact-card-title"><div class="contact-name-row"><h4>${escapeHtml(c.name)}</h4><span class="badge-tag ${c.status === 'online' ? 'pass' : 'gray'}">${escapeHtml(c.statusLabel || 'Disponible')}</span></div><p class="contact-role">${escapeHtml(c.role)} · ${escapeHtml(c.grade)}</p><small class="contact-dept">${escapeHtml(c.department || '')}</small></div></div><div class="contact-details-list"><div class="contact-detail-item"><span>Correo institucional:</span><strong>${escapeHtml(c.email)}</strong></div><div class="contact-detail-item"><span>Atención a padres:</span><strong>${escapeHtml(c.schedule)}</strong></div><div class="contact-detail-item"><span>Ubicación:</span><strong>${escapeHtml(c.office)}</strong></div></div><div class="contact-card-actions"><button class="btn btn-primary btn-open-chat" type="button" data-contact-id="${c.id}">Enviar mensaje directo</button></div></article>`
    )
    .join('');
  container.querySelectorAll('.btn-open-chat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-contact-id');
      if (cid) onSelectContact(cid);
    });
  });
}
export function renderCommNotesView(commNotes, onToggleNote, onDeleteNote) {
  const container = document.getElementById('comm-notes-list');
  if (!container) return;
  container.innerHTML = commNotes
    .map(
      (n) => `
    <div class="sidebar-note-item ${n.done ? 'done' : ''}" data-note-id="${n.id}"><label><input type="checkbox" class="chk-note" ${n.done ? 'checked' : ''}><span>${escapeHtml(n.text)}</span></label><button class="btn-del-note" type="button" aria-label="Eliminar recordatorio">&times;</button></div>`
    )
    .join('');
  container.querySelectorAll('.chk-note').forEach((chk) => {
    chk.addEventListener('change', () => {
      const id = chk.closest('.sidebar-note-item')?.getAttribute('data-note-id');
      if (id) onToggleNote(id, chk.checked);
    });
  });
  container.querySelectorAll('.btn-del-note').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.sidebar-note-item')?.getAttribute('data-note-id');
      if (id) onDeleteNote(id);
    });
  });
}
export function updateTelemetryModalView(telemetryLogs) {
  const viewer = document.getElementById('telemetry-json-viewer');
  if (!viewer) return;
  viewer.textContent = telemetryLogs.map((entry) => JSON.stringify(entry, null, 2)).join('\n\n');
}
