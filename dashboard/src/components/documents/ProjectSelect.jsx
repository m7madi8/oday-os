import { C, FONT_HEAD, RADIUS } from '../../theme';

export function ProjectSelect({ projects = [], value, onChange, placeholder = 'اختر المشروع' }) {
  const list = projects.filter((p) => p?.id && p?.name);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-3 text-base min-h-11 outline-none"
      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: RADIUS.md }}
    >
      <option value="">{placeholder}</option>
      {list.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
          {project.client?.name ? ` — ${project.client.name}` : ''}
        </option>
      ))}
    </select>
  );
}

export function ProjectOptionList({ projects = [], value, onChange }) {
  const list = projects.filter((p) => p?.id && p?.name);

  return (
    <ul className="os-project-pick-list" role="listbox">
      {list.map((project) => {
        const active = value === project.id;
        return (
          <li key={project.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={`os-project-pick ${active ? 'is-active' : ''}`}
              onClick={() => onChange(project.id)}
            >
              <span className="os-project-pick__name" style={{ fontFamily: FONT_HEAD }}>{project.name}</span>
              {project.client?.name ? (
                <span className="os-project-pick__client">{project.client.name}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
