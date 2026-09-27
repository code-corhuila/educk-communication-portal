export const ANNOUNCEMENT_CATEGORIES = Object.freeze({
  ALL: 'Todas',
  URGENT: 'Urgente',
  GENERAL: 'General',
  ACADEMIC: 'Académico'
});

export function normalizeAnnouncements(announcements) {
  return announcements.map((announcement) => ({
    ...announcement,
    category: announcement.category
      || (announcement.priority === 'high' ? 'URGENT' : announcement.tag === 'Eventos' ? 'ACADEMIC' : 'GENERAL'),
    isRead: Boolean(announcement.isRead)
  }));
}

export function filterAnnouncements(announcements, { category = 'ALL', date = '' } = {}) {
  return announcements.filter((announcement) => {
    const matchesCategory = category === 'ALL' || announcement.category === category;
    const matchesDate = !date || announcement.date === date;
    return matchesCategory && matchesDate;
  });
}

export function markAnnouncementRead(announcements, announcementId) {
  return announcements.map((announcement) => (
    announcement.id === announcementId
      ? { ...announcement, isRead: true }
      : announcement
  ));
}
