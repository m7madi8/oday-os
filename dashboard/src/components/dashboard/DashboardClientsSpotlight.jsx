import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, Users } from 'lucide-react';
import { listClients } from '../../lib/api/clients';
import { listProjects } from '../../lib/api/projects';
import {
  buildProjectCountByClient,
  enrichClientsWithProjects,
} from '../../lib/clients/clientFilters';
import { pickDashboardClients } from '../../lib/dashboard/clientSpotlight';
import { keys } from '../../lib/query';
import { entityName, primaryContact } from '../../lib/labels';
import { C, FONT_HEAD, RADIUS } from '../../theme';
import { LoadingBlock } from '../ui/Actions';

const ICON = 1.5;

export function DashboardClientsSpotlight({ config, onNavigate }) {
  const clientsQuery = useQuery({
    queryKey: keys.clients('dashboard-spotlight'),
    queryFn: () => listClients({ per_page: 200 }),
  });
  const projectsQuery = useQuery({
    queryKey: keys.projects('dashboard-spotlight'),
    queryFn: () => listProjects({ per_page: 300 }),
  });

  const rows = useMemo(() => {
    const projectCountMap = buildProjectCountByClient(projectsQuery.data?.data || []);
    const enriched = enrichClientsWithProjects(clientsQuery.data?.data || [], projectCountMap);
    return pickDashboardClients(enriched, config);
  }, [clientsQuery.data, projectsQuery.data, config]);

  const mode = config?.clientMode === 'pinned' ? 'pinned' : 'latest';
  const subtitle = mode === 'pinned' && (config?.pinnedClientIds?.length || 0) > 0
    ? 'عملاء محدّدون من الإعدادات'
    : 'آخر العملاء المضافين';

  const loading = clientsQuery.isLoading || projectsQuery.isLoading;

  return (
    <section
      className="os-desk-clients os-surface flex flex-col min-h-0 min-w-0"
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
      }}
      aria-labelledby="desk-clients-title"
    >
      <div className="os-desk-clients__head">
        <div>
          <h3 id="desk-clients-title" style={{ color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600 }}>
            العملاء
          </h3>
          <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>{subtitle}</p>
        </div>
        {onNavigate ? (
          <button
            type="button"
            className="os-desk-sketches__link"
            onClick={() => onNavigate('clients')}
          >
            كل العملاء
          </button>
        ) : null}
      </div>

      {loading ? <LoadingBlock /> : null}

      {!loading && rows.length === 0 ? (
        <div className="os-desk-clients__empty">
          <Users size={28} strokeWidth={1.25} aria-hidden="true" />
          <p>لا يوجد عملاء بعد. أضف عميلًا من صفحة العملاء.</p>
          {onNavigate ? (
            <button type="button" className="os-desk-sketches__link" onClick={() => onNavigate('clients')}>
              إضافة عميل
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className="os-desk-clients__list">
          {rows.map((client) => {
            const contact = primaryContact(client);
            const phone = contact?.phone || client.phone || '';
            const email = contact?.email || client.email || '';
            return (
              <li key={client.id}>
                <button
                  type="button"
                  className="os-desk-client-row"
                  onClick={() => onNavigate?.('clients')}
                >
                  <span className="os-desk-client-row__main">
                    <strong>{entityName(client)}</strong>
                    <span>{client.project_count || 0} مشروع</span>
                  </span>
                  <span className="os-desk-client-row__meta">
                    {phone ? (
                      <span>
                        <Phone size={14} strokeWidth={ICON} aria-hidden="true" />
                        {phone}
                      </span>
                    ) : null}
                    {email ? (
                      <span>
                        <Mail size={14} strokeWidth={ICON} aria-hidden="true" />
                        {email}
                      </span>
                    ) : null}
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
