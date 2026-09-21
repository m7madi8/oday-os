import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { C } from '../../theme';
import { palestinianBanks } from '../../data/palestinianBanks';
import { searchPalestinianBanks } from '../../lib/cheques/bankSearch';

function monogram(bank) {
  const label = bank.nameAr || bank.nameEn || 'ب';
  return label.trim().charAt(0);
}

export function ChequeBankSelect({ value, onChange, id = 'cheque-bank' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => palestinianBanks.find((b) => b.id === value) || null,
    [value],
  );

  const options = useMemo(() => searchPalestinianBanks(query), [query]);

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 text-start cursor-pointer outline-none focus-visible:ring-2"
        style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: C.tint, color: C.ink }}
              aria-hidden="true"
            >
              {monogram(selected)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium truncate">{selected.nameAr}</span>
              <span className="block text-xs truncate" style={{ color: C.inkFaint }} dir="ltr">
                {selected.nameEn}
                {selected.verified && selected.iban4LetterCode ? ` · ${selected.iban4LetterCode}` : ''}
              </span>
            </span>
          </>
        ) : (
          <span style={{ color: C.inkSoft }}>اختر البنك</span>
        )}
      </button>
      {open ? (
        <div
          className="absolute z-20 mt-1 w-full rounded-xl shadow-md overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
          role="listbox"
        >
          <label className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: C.border }}>
            <Search size={16} style={{ color: C.inkFaint }} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم"
              className="flex-1 py-2 text-base outline-none min-h-11"
              style={{ background: 'transparent', color: C.ink }}
              autoFocus
            />
          </label>
          <ul className="max-h-56 overflow-y-auto">
            {options.map((bank) => (
              <li key={bank.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={bank.id === value}
                  className="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 text-start cursor-pointer hover:bg-[var(--c-tint)]"
                  onClick={() => {
                    onChange(bank);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold"
                    style={{ background: C.tint }}
                    aria-hidden="true"
                  >
                    {monogram(bank)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{bank.nameAr}</span>
                    <span className="block text-xs truncate" style={{ color: C.inkFaint }} dir="ltr">
                      {bank.nameEn}
                      {bank.verified && bank.iban4LetterCode ? ` · ${bank.iban4LetterCode}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
