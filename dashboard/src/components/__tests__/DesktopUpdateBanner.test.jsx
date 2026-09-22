import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DesktopUpdateBanner } from '../DesktopUpdateBanner';

beforeEach(() => {
  window.oday = {
    desktop: true,
    store: {},
    updates: {
      getState: vi.fn().mockResolvedValue({ phase: 'idle', currentVersion: '1.0.0' }),
      onState: vi.fn(() => () => {}),
      check: vi.fn(),
      install: vi.fn(),
      dismiss: vi.fn(),
      syncServer: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  delete window.oday;
});

describe('DesktopUpdateBanner', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<DesktopUpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows ready state with action buttons', async () => {
    window.oday.updates.getState = vi.fn().mockResolvedValue({
      phase: 'ready',
      currentVersion: '1.0.0',
      version: '1.0.1',
    });
    window.oday.updates.onState = vi.fn((listener) => {
      listener({ phase: 'ready', currentVersion: '1.0.0', version: '1.0.1' });
      return () => {};
    });
    render(<DesktopUpdateBanner />);
    expect(await screen.findByText('التحديث جاهز')).toBeTruthy();
    expect(screen.getByText('تحديث الآن')).toBeTruthy();
    expect(screen.getByText('لاحقاً')).toBeTruthy();
  });
});
