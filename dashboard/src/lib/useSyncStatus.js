import { useEffect, useState } from 'react';
import { getSyncStatus, onSyncStatus } from '../lib/storage';

export function useSyncStatus() {
  const [status, setStatus] = useState(getSyncStatus);

  useEffect(() => onSyncStatus(setStatus), []);

  return status;
}
