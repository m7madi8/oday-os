/** Mirrors App\Services\Oday\OdayChequeStatusService (dashboard copy for UI guards). */

export function normalizeDirection(direction) {
  const d = String(direction || '').toLowerCase();
  if (d === 'out' || d === 'outgoing') return 'outgoing';
  return 'incoming';
}

export function isTerminal(status) {
  return ['cleared', 'returned', 'cancelled'].includes(status);
}

export function requiresReason(status) {
  return status === 'returned' || status === 'cancelled';
}

export function allowedNextStatuses(direction, currentStatus) {
  const dir = normalizeDirection(direction);
  const from = currentStatus;
  if (isTerminal(from)) return [];

  if (dir === 'outgoing') {
    switch (from) {
      case 'draft':
        return ['printed', 'cancelled'];
      case 'printed':
        return ['delivered', 'cancelled'];
      case 'delivered':
        return ['cleared', 'returned', 'cancelled'];
      default:
        return [];
    }
  }

  switch (from) {
    case 'received':
    case 'pending':
      return ['deposited', 'cancelled'];
    case 'deposited':
      return ['processing', 'cancelled'];
    case 'processing':
      return ['cleared', 'returned', 'cancelled'];
    default:
      return [];
  }
}

export function canTransition(direction, from, to) {
  if (from === to) return true;
  if (isTerminal(from)) return false;
  return allowedNextStatuses(direction, from).includes(to);
}

/** @returns {string[]} ordered statuses for direction (for timeline labels only) */
export function statusOrderForDirection(direction) {
  const dir = normalizeDirection(direction);
  if (dir === 'outgoing') {
    return ['draft', 'printed', 'delivered', 'cleared', 'returned', 'cancelled'];
  }
  return ['received', 'deposited', 'processing', 'cleared', 'returned', 'cancelled'];
}

/**
 * Build reached statuses from history records only.
 * @param {{ new_status: string }[]} history
 */
export function statusesReachedFromHistory(history = []) {
  const set = new Set();
  history.forEach((row) => {
    if (row.new_status) set.add(row.new_status);
    if (row.old_status) set.add(row.old_status);
  });
  return set;
}
