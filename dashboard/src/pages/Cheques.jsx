import { useEffect, useMemo, useState } from 'react';
import {
  parseChequeRoute,
  getAppPath,
  subscribeAppRoute,
  goToChequeList,
  goToChequeDetail,
} from '../lib/routing/appRoutes';
import { ChequeRegisterPage } from './cheques/ChequeRegisterPage';
import { ChequeWorkspace } from '../components/cheques/ChequeWorkspace';
import { ChequeDetailView } from '../components/cheques/ChequeDetailView';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';

function useChequeRoute() {
  const [path, setPath] = useState(getAppPath);
  useEffect(() => subscribeAppRoute((next) => setPath(next)), []);
  return useMemo(() => parseChequeRoute(path), [path]);
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280);
  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < 1280);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return narrow;
}

export function Cheques({ hidden }) {
  const { session } = useAuth();
  const route = useChequeRoute();
  const narrow = useIsNarrow();
  const canCreate = canUser(session?.user, 'create_payment');

  useEffect(() => {
    if (!route) goToChequeList({}, true);
  }, [route]);

  if (!route) {
    return null;
  }

  if (route.view === 'new') {
    return (
      <ChequeWorkspace
        mode="create"
        hidden={hidden}
        onCancel={() => goToChequeList()}
      />
    );
  }

  if (route.view === 'detail' && route.id) {
    if (narrow) {
      return (
        <ChequeDetailView
          chequeId={route.id}
          hidden={hidden}
          mobileFullScreen
          onBack={() => goToChequeList()}
        />
      );
    }
    return (
      <ChequeRegisterPage
        hidden={hidden}
        canCreate={canCreate}
        selectedId={route.id}
        onSelectId={(id) => {
          if (id) goToChequeDetail(id);
        }}
      />
    );
  }

  return (
    <ChequeRegisterPage
      hidden={hidden}
      canCreate={canCreate}
      selectedId={null}
      onSelectId={(id) => {
        if (id) goToChequeDetail(id);
      }}
    />
  );
}
