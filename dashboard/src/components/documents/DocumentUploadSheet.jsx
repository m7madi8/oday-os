import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { C, RADIUS } from '../../theme';
import { Sheet } from '../ui/Sheet';
import { GhostButton, PrimaryButton } from '../ui/Actions';
import { TextInput } from '../settings/Fields';
import { DOCUMENT_CATEGORIES } from '../../lib/documentCategories';
import { ProjectOptionList } from './ProjectSelect';
import { isDesktop } from '../../lib/desktop';
import { pickNativeFile } from '../../lib/files';

export function DocumentUploadSheet({
  open,
  title = 'رفع مستند',
  onClose,
  projects = [],
  lockedProjectId = '',
  lockedClientName = '',
  loading = false,
  onUpload,
}) {
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('drawing');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const effectiveProjectId = lockedProjectId || projectId;

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === effectiveProjectId),
    [projects, effectiveProjectId],
  );

  const clientLabel = lockedClientName
    || selectedProject?.client?.name
    || '—';

  useEffect(() => {
    if (!open) return;
    if (lockedProjectId) setProjectId(lockedProjectId);
    else setProjectId('');
    setFile(null);
    setCategory('drawing');
  }, [open, lockedProjectId]);

  function takeFile(next) {
    if (next) setFile(next);
  }

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {!lockedProjectId ? (
        <div className="space-y-2">
          <span className="block text-base" style={{ color: C.inkSoft }}>المشروع *</span>
          <ProjectOptionList projects={projects} value={effectiveProjectId} onChange={setProjectId} />
        </div>
      ) : (
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المشروع</span>
          <TextInput value={selectedProject?.name || '—'} readOnly />
        </label>
      )}

      <label className="block mt-4">
        <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>العميل</span>
        <TextInput value={clientLabel} readOnly />
      </label>

      <label className="block mt-4">
        <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>نوع الملف</span>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full px-3 py-3 text-base min-h-11 outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: RADIUS.md }}
        >
          {DOCUMENT_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <div
        className="mt-4 rounded-2xl p-6 text-center"
        style={{
          border: `1px dashed ${dragOver ? C.focus : C.border}`,
          background: C.paper,
          color: C.inkSoft,
        }}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          takeFile(event.dataTransfer.files?.[0]);
        }}
      >
        <p className="text-sm">{file ? file.name : 'اسحب الملف هنا أو اختره'}</p>
        <div className="mt-3 flex justify-center gap-2 flex-wrap">
          <GhostButton type="button" onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            اختيار ملف
          </GhostButton>
          {isDesktop() ? (
            <GhostButton type="button" onClick={async () => takeFile(await pickNativeFile())}>
              نافذة النظام
            </GhostButton>
          ) : null}
        </div>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => takeFile(event.target.files?.[0])} />
      </div>

      <PrimaryButton
        className="mt-4 w-full"
        disabled={!effectiveProjectId || !file || loading}
        loading={loading}
        onClick={() => onUpload({ projectId: effectiveProjectId, file, category })}
      >
        رفع إلى الخادم
      </PrimaryButton>
    </Sheet>
  );
}
