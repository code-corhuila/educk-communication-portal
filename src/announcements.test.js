import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAnnouncements, markAnnouncementRead, normalizeAnnouncements } from './announcements.js';

const announcements = [
  { id: '1', category: 'URGENT', date: '2026-09-18', isRead: false },
  { id: '2', category: 'GENERAL', date: '2026-09-15', isRead: false },
  { id: '3', category: 'ACADEMIC', date: '2026-09-18', isRead: true }
];

test('ALL returns every announcement', () => {
  assert.equal(filterAnnouncements(announcements, { category: 'ALL' }).length, 3);
});

test('filters announcements by category', () => {
  assert.deepEqual(
    filterAnnouncements(announcements, { category: 'ACADEMIC' }).map(({ id }) => id),
    ['3']
  );
});

test('filters announcements by date', () => {
  assert.deepEqual(
    filterAnnouncements(announcements, { date: '2026-09-18' }).map(({ id }) => id),
    ['1', '3']
  );
});

test('returns an empty list when filters have no matches', () => {
  assert.deepEqual(
    filterAnnouncements(announcements, { category: 'GENERAL', date: '2026-09-18' }),
    []
  );
});

test('marks one announcement as read without mutating the source list', () => {
  const updated = markAnnouncementRead(announcements, '1');

  assert.equal(updated[0].isRead, true);
  assert.equal(announcements[0].isRead, false);
  assert.notStrictEqual(updated, announcements);
});

test('normalizes announcements saved with the legacy data shape', () => {
  const [normalized] = normalizeAnnouncements([{ id: 'legacy', priority: 'high', tag: 'Oficial' }]);

  assert.equal(normalized.category, 'URGENT');
  assert.equal(normalized.isRead, false);
});
