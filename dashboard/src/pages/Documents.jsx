import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import {
  assignDocumentToProject,
  downloadDocument,
  listDocuments,
  updateDocumentMeta,
  uploadProjectDocument,
} from '../lib/api/documents';
import { listClients } from '../lib/api/clients';
import { listProjects } from '../lib/api/projects';
import { invalidateFinance, keys } from '../lib/query';
import { C, RADIUS } from '../theme';
import { categoryLabel, DOCUMENT_CATEGORIES } from '../lib/documentCategories';
import { buildClientMap, buildProjectMap, formatDocDate, resolveDocumentMeta } from '../lib/documents/resolve';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';
import { DocumentUploadSheet } from '../components/documents/DocumentUploadSheet';
import { ProjectSelect } from '../components/documents/ProjectSelect';
import { GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { Sheet } from '../components/ui/Sheet';
import { showToast } from '../lib/toast';
import { isDesktop } from '../lib/desktop';
import { openOrSaveBlob, pickNativeFile } from '../lib/files';

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

export function Documents() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [assignProjectId, setAssignProjectId] = useState('');

  const query = useQuery({
    queryKey: keys.documents(`${search}|${projectFilter}|${clientFilter}|${typeFilter}`),
    queryFn: () =>
      listDocuments({
        filter: search || undefined,
        project_id: projectFilter || undefined,
        client_id: clientFilter || undefined,
        category: typeFilter,
        per_page: 100,
      }),
  });
  const projects = useQuery({
    queryKey: keys.projects('all-docs'),
    queryFn: () => listProjects({ per_page: 200 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 200 }) });

  const projectMap = useMemo(() => buildProjectMap(projects.data?.data || []), [projects.data]);
  const clientMap = useMemo(() => buildClientMap(clients.data?.data || []), [clients.data]);

  const rows = useMemo(() => {
    const list = query.data?.data || [];
    return [...list].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [query.data]);

  const canCreate = canUser(session?.user, 'create_client') || canUser(session?.user, 'edit_client');

  const uploadMutation = useMutation({
    mutationFn: uploadWithCategory,
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      showToast('رُفع المستند إلى الخادم', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: () => assignDocumentToProject(detail.id, assignProjectId),
    onSuccess: async () => {
      await invalidateFinance();
      setDetail(null);
      setAssignProjectId('');
      showToast('تم ربط الملف بالمشروع', 'ok');
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
    <div className="os-files-archive space-y-4 min-w-0">
      <div className="os-files-filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث في الملفات أو المشاريع أو العملاء"
          className="os-search w-full px-3 py-3 text-base min-h-11 outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: RADIUS.md }}
        />
        <div className="os-files-filters__row">
          <label className="os-files-filter">
            <span>المشروع</span>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">كل المشاريع</option>
              {(projects.data?.data || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="os-files-filter">
            <span>العميل</span>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="">كل العملاء</option>
              {(clients.data?.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="os-files-filter">
            <span>النوع</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">كل الأنواع</option>
              {DOCUMENT_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <PrimaryButton type="button" onClick={() => setOpen(true)}>
              <Upload size={15} />
              رفع مستند
            </PrimaryButton>
          ) : null}
          {isDesktop() ? (
            <GhostButton
              type="button"
              onClick={async () => {
                const picked = await pickNativeFile();
                if (picked) setOpen(true);
              }}
            >
              اختيار من الجهاز
            </GhostButton>
          ) : null}
        </div>
      </div>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <p className="text-base" style={{ color: C.burgundy }}>{query.error?.message}</p>
      ) : null}

      {!query.isLoading && !query.isError && rows.length === 0 ? (
        <div
          className="os-surface text-center px-6 py-16"
          style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: RADIUS.md }}
        >
          <p className="text-lg font-semibold" style={{ color: C.ink }}>لا مستندات</p>
          <p className="text-base mt-2" style={{ color: C.inkSoft }}>
            الملفات تُحفظ على خادم ODAY OS ومرتبطة بالمشاريع.
          </p>
        </div>
      ) : null}

      {!query.isLoading && rows.length > 0 ? (
        <div className="os-files-table-wrap" style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.md, background: C.card }}>
          <table className="os-files-table w-full text-base">
            <thead>
              <tr>
                <th>الملف</th>
                <th className="phone-hide">المشروع</th>
                <th>العميل</th>
                <th className="phone-hide">النوع</th>
                <th className="phone-hide">التاريخ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = resolveDocumentMeta(row, projectMap, clientMap);
                return (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="os-files-link" onClick={() => setDetail(row)}>
                        {row.name || 'مستند'}
                      </button>
                    </td>
                    <td className="phone-hide" style={{ color: C.inkSoft }}>
                      {meta.unassignedProject ? 'غير مربوط' : meta.projectName || '—'}
                    </td>
                    <td style={{ color: C.inkSoft }}>{meta.clientName || '—'}</td>
                    <td className="phone-hide">{categoryLabel(row.category)}</td>
                    <td className="phone-hide os-num">{formatDocDate(row.created_at)}</td>
                    <td>
                      <GhostButton type="button" onClick={() => saveRow(row)}>
                        <Download size={14} />
                      </GhostButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <DocumentUploadSheet
        open={open}
        onClose={() => setOpen(false)}
        projects={projects.data?.data || []}
        loading={uploadMutation.isPending}
        onUpload={(payload) => uploadMutation.mutate(payload)}
      />

      <Sheet open={!!detail} title="تفاصيل الملف" onClose={() => setDetail(null)}>
        {detail ? (
          <div className="space-y-3">
            <p className="text-lg font-semibold" style={{ color: C.ink }}>{detail.name}</p>
            {(() => {
              const meta = resolveDocumentMeta(detail, projectMap, clientMap);
              return (
                <>
                  <p style={{ color: C.inkSoft }}>
                    <strong>المشروع:</strong>{' '}
                    {meta.unassignedProject ? 'غير مربوط' : meta.projectName || '—'}
                  </p>
                  <p style={{ color: C.inkSoft }}>
                    <strong>العميل:</strong> {meta.clientName || '—'}
                  </p>
                  <p style={{ color: C.inkSoft }}>
                    <strong>النوع:</strong> {categoryLabel(detail.category)}
                  </p>
                  <p style={{ color: C.inkSoft }}>
                    <strong>التاريخ:</strong> {formatDocDate(detail.created_at)}
                  </p>
                  {detail.size ? (
                    <p className="os-num" style={{ color: C.inkSoft }}>
                      <strong>الحجم:</strong> {Math.round(detail.size / 1024)} KB
                    </p>
                  ) : null}
                </>
              );
            })()}
            <div className="flex flex-wrap gap-2 pt-2">
              <PrimaryButton type="button" onClick={() => saveRow(detail)}>تنزيل</PrimaryButton>
              {resolveDocumentMeta(detail, projectMap, clientMap).unassignedProject ? (
                <>
                  <ProjectSelect
                    projects={projects.data?.data || []}
                    value={assignProjectId}
                    onChange={setAssignProjectId}
                    placeholder="اختر مشروعًا للربط"
                  />
                  <PrimaryButton
                    type="button"
                    disabled={!assignProjectId || assignMutation.isPending}
                    loading={assignMutation.isPending}
                    onClick={() => assignMutation.mutate()}
                  >
                    ربط بمشروع
                  </PrimaryButton>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
