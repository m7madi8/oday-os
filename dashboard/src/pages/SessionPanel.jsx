import { C, FONT_HEAD } from '../theme';
import { useAuth } from '../lib/auth/AuthProvider';
import { displayName } from '../lib/permissions';
import { isDesktop } from '../lib/desktop';
import { getRuntimeServerUrl, persistServerUrl } from '../lib/env';
import { PrimaryButton, GhostButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { useState } from 'react';
import { showToast } from '../lib/toast';

export function SessionPanel() {
  const { session, logout } = useAuth();
  const [serverUrl, setServerUrl] = useState(getRuntimeServerUrl());
  const desktop = isDesktop();

  return (
    <section className="os-surface p-5 sm:p-7 mb-5 min-w-0" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
        الجلسة والخادم
      </h3>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
        {displayName(session?.user)} · {session?.company?.name || 'ODAY OS'}
      </p>
      {desktop ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <TextInput
            dir="ltr"
            className="text-left"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="http://127.0.0.1:8000"
          />
          <GhostButton
            onClick={async () => {
              const next = await persistServerUrl(serverUrl);
              showToast(next ? 'تم حفظ عنوان الخادم' : 'العنوان غير صالح', next ? 'ok' : 'error');
            }}
          >
            حفظ العنوان
          </GhostButton>
        </div>
      ) : null}
      <PrimaryButton onClick={() => logout()}>تسجيل الخروج</PrimaryButton>
    </section>
  );
}
