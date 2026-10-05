export const PROJECT_STATUS_OPTIONS = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'active', label: 'نشط' },
  { id: 'on_hold', label: 'معلق' },
  { id: 'finished', label: 'منتهي' },
  { id: 'cancelled', label: 'ملغي' },
];

const STATUS_LABEL_BY_ID = Object.fromEntries(
  PROJECT_STATUS_OPTIONS.filter((o) => o.id !== 'all').map((o) => [o.id, o.label]),
);

/** @param {string[]} configuredNames — من الإعدادات › أتعاب الخدمات (projectTypes[].name) */
export function getProjectTypeFilterOptions(rows = [], configuredNames = []) {
  const merged = new Set(
    (configuredNames || []).map((name) => String(name || '').trim()).filter(Boolean),
  );
  rows.forEach((row) => {
    const type = String(row?.custom_value1 || '').trim();
    if (type) merged.add(type);
  });
  return [...merged];
}

export function resolveProjectStatus(row) {
  if (Number(row?.archived_at) > 0 || row?.is_deleted) return 'cancelled';
  const raw = String(row?.custom_value2 || '').trim();
  if (raw === 'on_hold' || raw === 'finished' || raw === 'cancelled') return raw;
  return 'active';
}

export function projectStatusLabel(statusId) {
  return STATUS_LABEL_BY_ID[statusId] || statusId || '—';
}

export function projectStatusStorageValue(statusId) {
  if (statusId === 'active' || !statusId) return '';
  return statusId;
}
