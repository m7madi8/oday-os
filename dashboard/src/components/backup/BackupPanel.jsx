import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cloud, FolderOpen, History, Loader2, Play, RefreshCw } from 'lucide-react';
import { C, FONT_HEAD, RADIUS } from '../../theme';
import { isDesktop } from '../../lib/desktop';
import { isLocalToken } from '../../lib/auth/session';
import { useAuth } from '../../lib/auth/AuthProvider';
import { showToast } from '../../lib/toast';
import {
  connectBackupGoogle,
  disconnectBackupGoogle,
  downloadBackupRun,
  fetchBackupRuns,
  fetchBackupSettings,
  markBackupLocalSynced,
  restoreBackupRun,
  retryBackupRun,
  runBackupNow,
  saveBackupSettings,
  testBackupLocalFolder,
} from '../../lib/api/backup';
import {
  pickLocalBackupDirectory,
  supportsDirectoryPicker,
  syncPendingLocalBackups,
} from '../../lib/backup/localSync';

function StatusChip({ ok, label }) {
  const color = ok ? C.emerald : C.burgundy;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]" style={{ background: ok ? C.emeraldSoft : C.burgundySoft, color }}>
      {label}
    </span>
  );
}

export function BackupPanel() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const apiReady = Boolean(session?.token && !isLocalToken(session.token));
  const desktop = isDesktop();

  const settingsQuery = useQuery({
    queryKey: ['backup-settings'],
    queryFn: fetchBackupSettings,
    enabled: apiReady,
  });

  const runsQuery = useQuery({
    queryKey: ['backup-runs'],
    queryFn: fetchBackupRuns,
    enabled: apiReady,
    refetchInterval: (q) => (q.state.data?.runs?.some((r) => r.status === 'running') ? 4000 : false),
  });

  const settings = settingsQuery.data?.settings;
  const googleConnected = Boolean(settingsQuery.data?.google_connected);
  const runs = runsQuery.data?.runs || [];

  const [busy, setBusy] = useState('');
  const [restoreId, setRestoreId] = useState(null);

  const patchSettings = useMutation({
    mutationFn: saveBackupSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backup-settings'] }),
  });

  const syncLocal = useCallback(async () => {
    if (!apiReady) return;
    try {
      const result = await syncPendingLocalBackups(runs, (id, checksum) => markBackupLocalSynced(id, checksum));
      if (result.synced > 0) {
        showToast(`تمت مزامنة ${result.synced} نسخة محلياً`, 'ok');
        await queryClient.invalidateQueries({ queryKey: ['backup-runs'] });
      }
    } catch (error) {
      showToast(error.message || 'تعذر المزامنة المحلية', 'error');
    }
  }, [apiReady, runs, queryClient]);

  useEffect(() => {
    if (!apiReady) return undefined;
    syncLocal();
    const timer = setInterval(syncLocal, 60_000);
    return () => clearInterval(timer);
  }, [apiReady, syncLocal]);

  async function chooseLocalFolder() {
    setBusy('local');
    try {
      if (desktop && window.oday?.backup?.pickFolder) {
        const picked = await window.oday.backup.pickFolder();
        if (!picked?.path) return;
        await testBackupLocalFolder(picked.path);
        await patchSettings.mutateAsync({
          local_folder_path: picked.path,
          local_folder_label: picked.label || picked.path,
          local_mode: 'desktop',
        });
        showToast('تم اختيار مجلد النسخ المحلي', 'ok');
        return;
      }
      const handle = await pickLocalBackupDirectory();
      await patchSettings.mutateAsync({
        local_folder_label: handle.name,
        local_mode: 'web',
      });
      showToast('تم ربط المجلد — ستُنسخ النسخ while التطبيق مفتوح', 'ok');
    } catch (error) {
      showToast(error.message || 'تعذر اختيار المجلد', 'error');
    } finally {
      setBusy('');
    }
  }

  async function onRunBackup() {
    setBusy('run');
    try {
      await runBackupNow();
      showToast('بدء النسخ الاحتياطي', 'ok');
      await queryClient.invalidateQueries({ queryKey: ['backup-runs'] });
      setTimeout(syncLocal, 1500);
    } catch (error) {
      showToast(error.message || 'تعذر تشغيل النسخ', 'error');
    } finally {
      setBusy('');
    }
  }

  const webNotice = useMemo(() => {
    if (desktop) return null;
    if (!supportsDirectoryPicker()) {
      return 'المتصفح الحالي لا يدعم النسخ المحلي التلقائي — استخدم Chrome/Edge أو تطبيق Windows، أو نزّل النسخ يدوياً.';
    }
    return 'النسخ المحلي يعمل while التطبيق مفتوح في Chrome/Edge. Google Drive يعمل من الخادم دائماً.';
  }, [desktop]);

  if (!apiReady) {
    return (
      <p className="text-[12px]" style={{ color: C.inkSoft }}>
        سجّل الدخول بحساب API للمكتب لتفعيل النسخ الاحتياطي المزدوج.
      </p>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <p className="text-[12px] inline-flex items-center gap-2" style={{ color: C.inkSoft }}>
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        جارٍ تحميل إعدادات النسخ…
      </p>
    );
  }

  if (settingsQuery.isError) {
    return (
      <p className="text-[12px]" style={{ color: C.burgundy }} role="alert">
        تعذر تحميل إعدادات النسخ. تحقق من الخادم ومتغيرات BACKUP_ENCRYPTION_KEY و CRON_SECRET.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {webNotice ? (
        <p className="text-[12px] rounded-lg p-3" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.inkSoft }}>
          {webNotice}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <Cloud size={16} aria-hidden="true" />
            <h4 className="text-sm font-medium" style={{ fontFamily: FONT_HEAD, color: C.ink }}>
              Google Drive
            </h4>
          </div>
          <p className="text-[12px]" style={{ color: C.inkSoft }}>
            {googleConnected
              ? `مرتبط: ${settings?.google_account_email || '—'} · ${settings?.drive_folder_name || 'ODAY OS Backups'}`
              : 'غير مرتبط'}
          </p>
          <div className="flex flex-wrap gap-2">
            {googleConnected ? (
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm min-h-10"
                style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
                onClick={async () => {
                  await disconnectBackupGoogle();
                  queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
                  showToast('تم فصل Google Drive', 'ok');
                }}
              >
                فصل
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm min-h-10"
                style={{ background: C.sidebar, color: C.sidebarTitle }}
                onClick={async () => {
                  const { url } = await connectBackupGoogle();
                  if (url) window.location.href = url;
                }}
              >
                ربط Google Drive
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <FolderOpen size={16} aria-hidden="true" />
            <h4 className="text-sm font-medium" style={{ fontFamily: FONT_HEAD, color: C.ink }}>
              مجلد محلي
            </h4>
          </div>
          <p className="text-[12px] break-all" style={{ color: C.inkSoft }}>
            {settings?.local_folder_path || settings?.local_folder_label || 'لم يُختر مجلد بعد'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === 'local'}
              className="rounded-lg px-3 py-2 text-sm min-h-10 disabled:opacity-50"
              style={{ background: C.sidebar, color: C.sidebarTitle }}
              onClick={chooseLocalFolder}
            >
              {busy === 'local' ? '…' : 'اختيار مجلد'}
            </button>
            {!desktop && supportsDirectoryPicker() ? (
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm min-h-10"
                style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
                onClick={syncLocal}
              >
                مزامنة محلية
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h4 className="text-sm font-medium" style={{ fontFamily: FONT_HEAD, color: C.ink }}>
          الجدولة
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[12px]" style={{ color: C.inkSoft }}>
            التكرار
            <select
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm min-h-10"
              style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
              value={settings?.frequency || 'daily'}
              onChange={(e) => patchSettings.mutate({ frequency: e.target.value })}
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
            </select>
          </label>
          <label className="text-[12px]" style={{ color: C.inkSoft }}>
            الوقت
            <input
              type="time"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm min-h-10"
              style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
              value={settings?.time_of_day || '03:00'}
              onChange={(e) => patchSettings.mutate({ time_of_day: e.target.value })}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled={busy === 'run'}
        onClick={onRunBackup}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm min-h-11 disabled:opacity-50"
        style={{ background: C.sidebar, color: C.sidebarTitle, borderRadius: RADIUS.md }}
      >
        {busy === 'run' ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        نسخ الآن
      </button>

      <div className="rounded-lg p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <History size={16} aria-hidden="true" />
          <h4 className="text-sm font-medium" style={{ fontFamily: FONT_HEAD, color: C.ink }}>
            السجل
          </h4>
          <button type="button" className="ms-auto" onClick={() => runsQuery.refetch()} aria-label="تحديث">
            <RefreshCw size={14} />
          </button>
        </div>
        {runsQuery.isLoading ? (
          <p className="text-[12px]" style={{ color: C.inkSoft }}>جارٍ التحميل…</p>
        ) : runs.length === 0 ? (
          <p className="text-[12px]" style={{ color: C.inkSoft }}>لا توجد نسخ بعد.</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id} className="rounded-lg p-3" style={{ border: `1px solid ${C.border}`, background: C.paper }}>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <p className="text-sm tabular-nums" style={{ color: C.ink }}>
                      #{String(run.seq).padStart(4, '0')} · {run.file_name}
                    </p>
                    <p className="text-[11px]" style={{ color: C.inkFaint }}>
                      {run.type === 'auto' ? 'تلقائي' : 'يدوي'} · {run.finished_at ? new Date(run.finished_at).toLocaleString('ar') : '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <StatusChip ok={run.drive_status === 'success'} label={`Drive: ${run.drive_status || '—'}`} />
                    <StatusChip ok={run.local_status === 'success' || run.local_status === 'pending_sync'} label={`Local: ${run.local_status || '—'}`} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {run.drive_status === 'failed' ? (
                    <button type="button" className="text-[12px] underline" style={{ color: C.burgundy }} onClick={() => retryBackupRun(run.id, 'drive').then(() => runsQuery.refetch())}>
                      إعادة Drive
                    </button>
                  ) : null}
                  {run.local_status === 'failed' ? (
                    <button type="button" className="text-[12px] underline" style={{ color: C.burgundy }} onClick={() => retryBackupRun(run.id, 'local').then(() => runsQuery.refetch())}>
                      إعادة Local
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-[12px] underline"
                    style={{ color: C.ink }}
                    onClick={async () => {
                      const blob = await downloadBackupRun(run.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = run.file_name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    تنزيل
                  </button>
                  <button type="button" className="text-[12px] underline" style={{ color: C.burgundy }} onClick={() => setRestoreId(run.id)}>
                    استعادة
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {restoreId ? (
        <div className="rounded-lg p-4" style={{ background: C.burgundySoft, border: `1px solid ${C.burgundyLine}` }}>
          <p className="text-sm" style={{ color: C.burgundy }}>
            الاستعادة ستستبدل بيانات المكتب الحالية. سيتم حفظ نسخة أمان قبل التنفيذ.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm min-h-10 text-white"
              style={{ background: C.burgundy }}
              onClick={async () => {
                try {
                  await restoreBackupRun(restoreId);
                  showToast('تمت الاستعادة', 'ok');
                  setRestoreId(null);
                } catch (error) {
                  showToast(error.message || 'تعذر الاستعادة', 'error');
                }
              }}
            >
              تأكيد الاستعادة
            </button>
            <button type="button" className="rounded-lg px-4 py-2 text-sm min-h-10" style={{ background: C.card, border: `1px solid ${C.border}` }} onClick={() => setRestoreId(null)}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
