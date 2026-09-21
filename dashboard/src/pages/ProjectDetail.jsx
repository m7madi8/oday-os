import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Download, FileText, Plus } from 'lucide-react';
import { getProject, listProjects } from '../lib/api/projects';
import { downloadDocument, listDocuments, updateDocumentMeta, uploadProjectDocument } from '../lib/api/documents';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, RADIUS, money } from '../theme';
import { categoryLabel } from '../lib/documentCategories';
import { buildClientMap, buildProjectMap, formatDocDate, resolveDocumentMeta } from '../lib/documents/resolve';
import { listClients } from '../lib/api/clients';
import { DocumentUploadSheet } from '../components/documents/DocumentUploadSheet';
import { GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { showToast } from '../lib/toast';
import { openOrSaveBlob } from '../lib/files';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';

async function uploadWithCategory({ projectId, file, category }) {
  await uploadProjectDocument(projectId, file);
  const list = await listDocuments({ project_id: projectId, per_page: 20 });
  const rows = list?.data || [];
  const match = rows.find((row) => row.name === file.name)
    || rows.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
  if (match?.id && category) {
    await updateDocumentMeta(match.id, { custom_value1: category });
  }
}

export function ProjectDetail({ projectId, hidden, onBack }) {
  const { session } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const project = useQuery({
    queryKey: keys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });
  const docs = useQuery({
    queryKey: keys.documents(`project:${projectId}`),
    queryFn: () => listDocuments({ project_id: projectId, per_page: 100 }),
    enabled: !!projectId,
  });
  const projects = useQuery({
    queryKey: keys.projects(''),
    queryFn: () => listProjects({ per_page: 100 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 100 }) });

  const data = project.data?.data;
  const projectMap = useMemo(() => buildProjectMap(projects.data?.data || []), [projects.data]);
  const clientMap = useMemo(() => buildClientMap(clients.data?.data || []), [clients.data]);
  const rows = useMemo(() => {
    const list = docs.data?.data || data?.documents || [];
    return [...list].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [docs.data, data?.documents]);

  const canUpload = canUser(session?.user, 'create_client') || canUser(session?.user, 'edit_client');

  const uploadMutation = useMutation({
    mutationFn: uploadWithCategory,
    onSuccess: async () => {
      await invalidateFinance();
      setUploadOpen(false);
      showToast('رُفع المستند إلى المشروع', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  async function saveRow(row) {
    try {
      const blob = await downloadDocument(row.id);
      await openOrSaveBlob(blob, row.name || 'document');
    } catch (error) {
      showToast(error.message || 'تعذر التنزيل', 'error');
    }
  }

  return (
    <div className="os-project-detail space-y-6 min-w-0">
      <div className="flex items-center gap-3 flex-wrap">
        <GhostButton type="button" onClick={onBack}>
          <ArrowRight size={16} />
          المشاريع
        </GhostButton>
      </div>

      {project.isLoading ? <LoadingBlock /> : null}
      {project.isError ? (
        <p className="text-base" style={{ color: C.burgundy }}>{project.error?.message}</p>
      ) : null}

      {data ? (
        <header className="os-project-detail__head">
          <h2 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
            {data.name}
          </h2>
          <p className="text-base mt-1" style={{ color: C.inkSoft }}>
            {data.client?.name || '—'}
            {data.due_date ? ` · ${data.due_date}` : ''}
          </p>
          <p className="text-base mt-2 os-num" style={{ color: C.ink }}>
            قيمة المشروع: {money(data.budgeted_amount || 0, hidden)}
          </p>
        </header>
      ) : null}

      <section className="os-doc-panel" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: RADIUS.md }}>
        <div className="os-doc-panel__head">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: FONT_HEAD, color: C.ink }}>
              مستندات المشروع
            </h3>
            <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>
              {rows.length} ملف
            </p>
          </div>
          {canUpload ? (
            <PrimaryButton type="button" onClick={() => setUploadOpen(true)}>
              <Plus size={15} />
              رفع مستند
            </PrimaryButton>
          ) : null}
        </div>

        {docs.isLoading ? <LoadingBlock /> : null}

        {!docs.isLoading && rows.length === 0 ? (
          <p className="os-doc-panel__empty" style={{ color: C.inkSoft }}>
            لا ملفات لهذا المشروع بعد. ارفع مخططًا أو عقدًا من الزر أعلاه.
          </p>
        ) : null}

        <ul className="os-doc-list">
          {rows.map((row) => {
            const meta = resolveDocumentMeta(row, projectMap, clientMap);
            return (
              <li key={row.id} className="os-doc-row">
                <div className="os-doc-row__icon" aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div className="os-doc-row__body min-w-0">
                  <strong className="os-doc-row__title">{row.name || 'مستند'}</strong>
                  <span className="os-doc-row__meta">
                    {categoryLabel(row.category)}
                    {' · '}
                    {formatDocDate(row.created_at)}
                  </span>
                  {meta.unassignedProject ? (
                    <span className="os-doc-row__warn">غير مربوط بمشروع — يمكن ربطه لاحقًا</span>
                  ) : null}
                </div>
                <GhostButton type="button" onClick={() => saveRow(row)}>
                  <Download size={14} />
                  تنزيل
                </GhostButton>
              </li>
            );
          })}
        </ul>
      </section>

      <DocumentUploadSheet
        open={uploadOpen}
        title="رفع مستند للمشروع"
        onClose={() => setUploadOpen(false)}
        projects={projects.data?.data || []}
        lockedProjectId={projectId}
        lockedClientName={data?.client?.name}
        loading={uploadMutation.isPending}
        onUpload={(payload) => uploadMutation.mutate(payload)}
      />

    </div>
  );
}
