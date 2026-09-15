import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { downloadDocument, listDocuments, uploadClientDocument } from '../lib/api/documents';
import { listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect, ResourcePage } from '../components/ui/ResourcePage';
import { GhostButton, PrimaryButton } from '../components/ui/Actions';
import { showToast } from '../lib/toast';
import { isDesktop } from '../lib/desktop';
import { openOrSaveBlob, pickNativeFile } from '../lib/files';
import { C } from '../theme';

export function Documents() {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const query = useQuery({
    queryKey: keys.documents(filter),
    queryFn: () => listDocuments({ filter, per_page: 50 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
  const rows = query.data?.data || [];
  const canCreate = canUser(session?.user, 'create_client') || canUser(session?.user, 'edit_client');

  const mutation = useMutation({
    mutationFn: () => uploadClientDocument(clientId, file),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setFile(null);
      showToast('رُفع المستند إلى الخادم', 'ok');
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

  const columns = useMemo(
    () => [
      { key: 'name', label: 'الملف', value: (row) => row.name || row.type || 'مستند' },
      { key: 'type', label: 'النوع', value: (row) => row.type || '—' },
      { key: 'size', label: 'الحجم', value: (row) => row.size ? `${Math.round(row.size / 1024)} KB` : '—' },
      {
        key: 'actions',
        label: '',
        render: (row) => (
          <GhostButton onClick={(event) => { event.stopPropagation(); saveRow(row); }}>
            <Download size={14} />
            تنزيل
          </GhostButton>
        ),
      },
    ],
    [],
  );

  function takeFile(next) {
    if (next) setFile(next);
  }

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث في المستندات"
        canCreate={canCreate}
        createLabel="رفع مستند"
        onCreate={() => setOpen(true)}
        extra={
          isDesktop() ? (
            <GhostButton
              onClick={async () => {
                const picked = await pickNativeFile();
                if (picked) {
                  setFile(picked);
                  setOpen(true);
                }
              }}
            >
              <Upload size={14} />
              اختيار من الجهاز
            </GhostButton>
          ) : null
        }
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={rows}
        columns={columns}
        emptyTitle="لا مستندات"
        emptyBody="الملفات تُحفظ على خادم ODAY OS، ليست على هذا الجهاز."
      />
      <Sheet open={open} title="رفع مستند" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>العميل</span>
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </label>
        <div
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            takeFile(event.dataTransfer.files?.[0]);
          }}
          className="rounded-2xl p-6 text-center"
          style={{
            border: `1px dashed ${dragOver ? C.focus : C.border}`,
            background: C.paper,
            color: C.inkSoft,
          }}
        >
          <p className="text-sm">{file ? file.name : 'اسحب الملف هنا أو اختره من الجهاز'}</p>
          <div className="mt-3 flex justify-center gap-2">
            <GhostButton onClick={() => inputRef.current?.click()}>اختيار ملف</GhostButton>
            {isDesktop() ? (
              <GhostButton
                onClick={async () => takeFile(await pickNativeFile())}
              >
                نافذة النظام
              </GhostButton>
            ) : null}
          </div>
          <input ref={inputRef} type="file" className="hidden" onChange={(event) => takeFile(event.target.files?.[0])} />
        </div>
        <PrimaryButton disabled={!clientId || !file || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          رفع إلى الخادم
        </PrimaryButton>
      </Sheet>
    </>
  );
}
