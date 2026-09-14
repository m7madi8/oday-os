import { C, FONT_BODY, FONT_HEAD, cardShadow, pad2 } from '../../theme';

export function SectionCard({ id, num, title, hint, children }) {
  return (
    <section
      id={id}
      className="rounded-2xl p-5 sm:p-7 scroll-mt-5"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow }}
    >
      <div className="flex items-start gap-3 mb-5">
        <span
          className="shrink-0 text-[11px] tabular-nums rounded-full flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            background: C.tint,
            color: C.inkSoft,
            border: `1px solid ${C.border}`,
          }}
        >
          {pad2(num)}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] sm:text-base font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
            {title}
          </h3>
          {hint && (
            <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: C.inkSoft }}>
              {hint}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={htmlFor} className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>
          {label}
        </label>
      )}
      {children}
      {hint && (
        <p className="text-[11px] mt-1.5" style={{ color: C.inkFaint }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const controlStyle = {
  background: C.paper,
  border: `1px solid ${C.border}`,
  color: C.ink,
  fontFamily: FONT_BODY,
};

export function TextInput({ id, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm min-h-11 outline-none transition-shadow ${className}`}
      style={controlStyle}
      {...props}
    />
  );
}

export function SelectInput({ id, children, className = '', ...props }) {
  return (
    <select
      id={id}
      className={`w-full rounded-xl px-3 py-2.5 text-sm min-h-11 outline-none ${className}`}
      style={controlStyle}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextArea({ id, className = '', ...props }) {
  return (
    <textarea
      id={id}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none ${className}`}
      style={controlStyle}
      {...props}
    />
  );
}

export function Segmented({ value, options, onChange, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5 p-1 rounded-xl"
      style={{ background: C.tint, border: `1px solid ${C.border}` }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className="flex-1 min-w-[5.5rem] min-h-10 px-3 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: selected ? C.sidebar : 'transparent',
              color: selected ? C.sidebarTitle : C.ink,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckRow({ checked, onChange, label, children }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-3 min-h-12"
      style={{ background: C.paper, border: `1px solid ${C.border}` }}
    >
      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-[10rem]">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="size-4 shrink-0"
          style={{ accentColor: 'var(--c-focus)' }}
        />
        <span className="text-sm" style={{ color: C.ink }}>
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}
