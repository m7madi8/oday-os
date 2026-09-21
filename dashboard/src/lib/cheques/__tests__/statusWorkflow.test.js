import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  canTransition,
  isTerminal,
  requiresReason,
} from '../statusWorkflow.js';

describe('statusWorkflow', () => {
  it('incoming received allows deposited and cancelled only', () => {
    expect(allowedNextStatuses('incoming', 'received')).toEqual(['deposited', 'cancelled']);
    expect(canTransition('incoming', 'received', 'deposited')).toBe(true);
    expect(canTransition('incoming', 'received', 'cleared')).toBe(false);
  });

  it('outgoing draft allows printed and cancelled', () => {
    expect(allowedNextStatuses('outgoing', 'draft')).toEqual(['printed', 'cancelled']);
  });

  it('terminal blocks further transitions', () => {
    expect(isTerminal('cleared')).toBe(true);
    expect(canTransition('incoming', 'cleared', 'returned')).toBe(false);
  });

  it('returned and cancelled require reason flag', () => {
    expect(requiresReason('returned')).toBe(true);
    expect(requiresReason('cancelled')).toBe(true);
    expect(requiresReason('deposited')).toBe(false);
  });
});
