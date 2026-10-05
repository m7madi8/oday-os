import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listClients } from '../../lib/api/clients';
import { keys } from '../../lib/query';
import { entityName } from '../../lib/labels';
import { C } from '../../theme';
import { Field, Segmented } from './Fields';
import { LoadingBlock } from '../ui/Actions';

export function DashboardClientsConfig({ dashboard, onPatch }) {
  const clientsQuery = useQuery({
    queryKey: keys.clients('settings-dashboard'),
    queryFn: () => listClients({ per_page: 200 }),
  });

  const clients = useMemo(
    () => [...(clientsQuery.data?.data || [])].sort((a, b) => (
      String(a.name || '').localeCompare(String(b.name || ''), 'ar')
    )),
    [clientsQuery.data],
  );

  const pinned = dashboard?.pinnedClientIds || [];
  const mode = dashboard?.clientMode === 'pinned' ? 'pinned' : 'latest';

  function toggleClient(id) {
    const set = new Set(pinned);
    if (set.has(id)) set.delete(id);
    else if (set.size < 12) set.add(id);
    onPatch({ pinnedClientIds: [...set] });
  }

  return (
    <div className="space-y-4">
      <Field label="عرض العملاء في لوحة التحكم">
        <Segmented
          ariaLabel="عرض العملاء في لوحة التحكم"
          value={mode}
          onChange={(clientMode) => onPatch({ clientMode })}
          options={[
            { id: 'latest', label: 'آخر العملاء' },
            { id: 'pinned', label: 'عملاء محدّدون' },
          ]}
        />
      </Field>

      {mode === 'pinned' ? (
        <div
          className="rounded-2xl p-3 max-h-72 overflow-y-auto space-y-1"
          style={{ background: C.paper, border: `1px solid ${C.border}` }}
        >
          {clientsQuery.isLoading ? <LoadingBlock /> : null}
          {!clientsQuery.isLoading && clients.length === 0 ? (
            <p className="text-sm px-2 py-4 text-center" style={{ color: C.inkSoft }}>
              لا يوجد عملاء بعد. أضف عملاء ثم اختر منهم.
            </p>
          ) : null}
          {clients.map((client) => {
            const checked = pinned.includes(client.id);
            return (
              <label
                key={client.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 cursor-pointer"
                style={{
                  background: checked ? C.tint : 'transparent',
                  border: `1px solid ${checked ? C.border : 'transparent'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleClient(client.id)}
                  className="size-4 shrink-0"
                  style={{ accentColor: 'var(--c-focus)' }}
                />
                <span className="text-sm font-medium truncate" style={{ color: C.ink }}>
                  {entityName(client)}
                </span>
              </label>
            );
          })}
          <p className="text-[12px] px-2 pt-2" style={{ color: C.inkFaint }}>
            حتى 12 عميلًا. الترتيب في اللوحة يتبع اختيارك.
          </p>
        </div>
      ) : (
        <p className="text-sm" style={{ color: C.inkSoft }}>
          تُعرض أحدث {dashboard?.clientLimit || 6} عملاء تلقائيًا حسب تاريخ الإضافة.
        </p>
      )}
    </div>
  );
}
