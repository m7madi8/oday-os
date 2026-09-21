import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ChequePreview } from '../ChequePreview';
import { BankLogo } from '../BankLogo';
import { genericManagementTemplate } from '../../../lib/cheques/templates/genericManagement';
import { resolveChequeTemplate } from '../../../lib/cheques/templates/registry';
import { useChequeA11ySummary } from '../../../lib/cheques/useChequeA11ySummary';
import { renderHook, act } from '@testing-library/react';

afterEach(() => cleanup());

const bankVerified = { id: 'bank-of-palestine', nameAr: 'بنك فلسطين', nameEn: 'Bank of Palestine', verified: true };
const bankUnverified = { id: 'quds-bank', nameAr: 'بنك القدس', verified: false };

function renderPreview(overrides = {}) {
  const data = {
    amount: '25000',
    currency: 'ILS',
    payee: 'مورد أ',
    issueDate: '2026-01-15',
    date: '2026-01-15',
    chequeNumber: '99',
    bank: bankVerified,
    accountMasked: '•••• 4821',
    memo: 'مشروع 12',
    ...overrides.data,
  };
  return render(
    <ChequePreview
      direction={overrides.direction || 'outgoing'}
      data={data}
      template={overrides.template || resolveChequeTemplate(data.bank)}
      mode={overrides.mode || 'screen'}
      printKind={overrides.printKind || 'management'}
      logoMode={overrides.logoMode || 'color'}
      zoom={1}
      printOffsets={overrides.printOffsets}
      showAdministrativeWatermark={overrides.showAdministrativeWatermark}
    />,
  );
}

describe('ChequePreview', () => {
  it('updates amount in numbers and words when amount changes', () => {
    const { rerender } = renderPreview();
    expect(screen.getByText(/25,000\.00/)).toBeTruthy();
    expect(screen.getByText(/خمسة وعشرون ألف شيكل فقط/)).toBeTruthy();

    rerender(
      <ChequePreview
        direction="outgoing"
        data={{
          amount: '35500',
          currency: 'ILS',
          payee: 'مورد أ',
          issueDate: '2026-01-15',
          chequeNumber: '99',
          bank: bankVerified,
        }}
        template={genericManagementTemplate}
        mode="screen"
        zoom={1}
      />,
    );
    expect(screen.getByText(/35,500\.00/)).toBeTruthy();
    expect(screen.getByText(/خمسة وثلاثون ألفًا وخمسمائة شيكل فقط/)).toBeTruthy();
  });

  it('updates payee and segmented date', () => {
    renderPreview({ data: { payee: 'شركة النور', issueDate: '2026-03-01' } });
    expect(screen.getByText(/شركة النور/)).toBeTruthy();
    const boxes = screen.getByTestId('cheque-date-boxes');
    expect(boxes.textContent).toContain('03');
    expect(boxes.textContent).toContain('2026');
  });

  it('shows bank name in monogram fallback', () => {
    renderPreview({ data: { bank: bankUnverified }, template: genericManagementTemplate });
    expect(screen.getByText(/بنك القدس/)).toBeTruthy();
  });

  it('uses generic template for unverified bank', () => {
    const template = resolveChequeTemplate(bankUnverified);
    expect(template.id).toBe('generic-management');
  });

  it('hides account when missing', () => {
    renderPreview({ data: { accountMasked: '' } });
    expect(screen.queryByText(/الحساب:/)).toBeNull();
  });

  it('applies print offsets only in print mode', () => {
    const { container } = renderPreview({
      mode: 'print',
      printOffsets: { xMm: 2, yMm: -1 },
    });
    const root = container.querySelector('.cheque-preview-root');
    expect(root.style.getPropertyValue('--print-offset-x-mm')).toBe('2mm');
  });

  it('incoming shows management mark', () => {
    renderPreview({ direction: 'incoming' });
    expect(screen.getByText(/معاينة إدارية/)).toBeTruthy();
  });

  it('bank-paper mode hides logo block class', () => {
    const { container } = renderPreview({ mode: 'print', printKind: 'bank-paper', template: { ...genericManagementTemplate, verified: true } });
    expect(container.querySelector('.cheque-preview--bank-paper')).toBeTruthy();
  });
});

describe('BankLogo', () => {
  it('renders monogram when no logo candidates exist', () => {
    render(<BankLogo bank={{ id: '', nameAr: 'بنك تجريبي', nameEn: 'Test' }} widthMm={20} heightMm={10} />);
    expect(document.querySelector('.bank-logo-monogram')).toBeTruthy();
    expect(screen.getByText('بن')).toBeTruthy();
  });
});

describe('useChequeA11ySummary', () => {
  it('debounces summary updates', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ data }) => useChequeA11ySummary(data, { debounceMs: 600 }),
      { initialProps: { data: { payee: 'أ', amount: '1', currency: 'ILS', date: '2026-01-01', bank: bankVerified } } },
    );
    const first = result.current.summary;
    rerender({ data: { payee: 'ب', amount: '2', currency: 'ILS', date: '2026-01-01', bank: bankVerified } });
    expect(result.current.summary).toBe(first);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.summary).toContain('ب');
    expect(result.current.summary).toContain('بنك فلسطين');
    vi.useRealTimers();
  });
});
