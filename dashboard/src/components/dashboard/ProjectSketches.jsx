import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ImageIcon } from 'lucide-react';
import { listDocuments, downloadDocument } from '../../lib/api/documents';
import { listProjects } from '../../lib/api/projects';
import { keys } from '../../lib/query';
import { C, FONT_HEAD, RADIUS } from '../../theme';
import { resolveDocumentMeta, formatDocDate } from '../../lib/documents/resolve';
import { LoadingBlock } from '../ui/Actions';
import { openOrSaveBlob } from '../../lib/files';
import { showToast } from '../../lib/toast';

function isImageDoc(doc) {
  const type = String(doc?.type || doc?.extension || '').toLowerCase();
  const name = String(doc?.name || '').toLowerCase();
  return (
    type.includes('image')
    || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)
  );
}

export function ProjectSketches({ onNavigate }) {
  const docsQuery = useQuery({
    queryKey: keys.documents('today-sketches'),
    queryFn: () => listDocuments({ category: 'drawing', per_page: 40 }),
  });
  const projectsQuery = useQuery({
    queryKey: keys.projects('today-sketches'),
    queryFn: () => listProjects({ per_page: 200 }),
  });

  const projectMap = useMemo(() => {
    const map = new Map();
    (projectsQuery.data?.data || []).forEach((p) => {
      if (p?.id) map.set(p.id, p);
    });
    return map;
  }, [projectsQuery.data]);

  const sketches = useMemo(() => {
    const rows = docsQuery.data?.data || [];
    return [...rows]
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      .slice(0, 12);
  }, [docsQuery.data]);

  async function openSketch(doc) {
    try {
      const blob = await downloadDocument(doc.id);
      await openOrSaveBlob(blob, doc.name || 'sketch');
    } catch (error) {
      showToast(error?.message || 'تعذر فتح الملف', 'error');
    }
  }

  return (
    <section
      className="os-desk-sketches os-surface flex flex-col min-h-0 min-w-0"
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
      }}
      aria-labelledby="desk-sketches-title"
    >
      <div className="os-desk-sketches__head">
        <div>
          <h3 id="desk-sketches-title" style={{ color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600 }}>
            أسكتشات المشاريع
          </h3>
          <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>
            أحدث المخططات والرسوم المرفوعة
          </p>
        </div>
        {onNavigate ? (
          <button
            type="button"
            className="os-desk-sketches__link"
            onClick={() => onNavigate('documents')}
          >
            كل الملفات
          </button>
        ) : null}
      </div>

      {docsQuery.isLoading ? <LoadingBlock /> : null}

      {!docsQuery.isLoading && sketches.length === 0 ? (
        <div className="os-desk-sketches__empty">
          <ImageIcon size={28} strokeWidth={1.25} aria-hidden="true" />
          <p>لا توجد أسكتشات بعد. ارفع مخططًا من ملفات المشاريع.</p>
          {onNavigate ? (
            <button type="button" className="os-desk-sketches__link" onClick={() => onNavigate('documents')}>
              فتح ملفات المشاريع
            </button>
          ) : null}
        </div>
      ) : null}

      {sketches.length ? (
        <ul className="os-desk-sketches__grid">
          {sketches.map((doc) => {
            const meta = resolveDocumentMeta(doc, projectMap, new Map());
            const image = isImageDoc(doc);
            return (
              <li key={doc.id}>
                <button type="button" className="os-desk-sketch-card" onClick={() => openSketch(doc)}>
                  <span className={`os-desk-sketch-card__thumb ${image ? 'is-image' : ''}`} aria-hidden="true">
                    {image ? <ImageIcon size={22} strokeWidth={1.25} /> : <Download size={20} strokeWidth={1.25} />}
                  </span>
                  <span className="os-desk-sketch-card__body">
                    <strong>{doc.name || 'ملف بدون اسم'}</strong>
                    <span>{meta.projectName || 'بدون مشروع'}</span>
                    <time>{formatDocDate(doc.created_at)}</time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
