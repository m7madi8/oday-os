function clientMillis(row) {
  const ts = Number(row?.created_at || 0);
  if (!ts) return 0;
  return ts > 1e12 ? ts : ts * 1000;
}

export function normalizeDashboardConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const limit = Number(source.clientLimit);
  return {
    clientMode: source.clientMode === 'pinned' ? 'pinned' : 'latest',
    pinnedClientIds: Array.isArray(source.pinnedClientIds)
      ? source.pinnedClientIds.filter(Boolean)
      : [],
    clientLimit: Number.isFinite(limit) && limit >= 1 ? Math.min(limit, 12) : 6,
  };
}

export function pickDashboardClients(clients = [], config) {
  const { clientMode, pinnedClientIds, clientLimit } = normalizeDashboardConfig(config);
  const cap = clientLimit;

  if (clientMode === 'pinned' && pinnedClientIds.length > 0) {
    const picked = pinnedClientIds
      .map((id) => clients.find((row) => row.id === id))
      .filter(Boolean);
    if (picked.length) return picked.slice(0, cap);
  }

  return [...clients]
    .sort((a, b) => clientMillis(b) - clientMillis(a))
    .slice(0, cap);
}
