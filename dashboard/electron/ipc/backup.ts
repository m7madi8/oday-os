import { dialog, ipcMain } from 'electron';
import { access, constants, mkdir, statfs, writeFile } from 'node:fs/promises';
import path from 'node:path';

function normalizePath(input: string) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  const resolved = path.resolve(trimmed);
  if (resolved.includes('..')) return null;
  return resolved;
}

async function validateWritable(folder: string, minBytes = 50_000_000) {
  await mkdir(folder, { recursive: true });
  await access(folder, constants.W_OK);
  try {
    const stats = await statfs(folder);
    if (stats.bavail * stats.bsize < minBytes) {
      throw new Error('مساحة غير كافية');
    }
  } catch {
    /* statfs not on all platforms */
  }
}

export function registerBackupIpc() {
  ipcMain.handle('oday:backup:pick-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const folder = normalizePath(result.filePaths[0]);
    if (!folder) throw new Error('مسار غير صالح');
    await validateWritable(folder);
    return { path: folder, label: path.basename(folder) };
  });

  ipcMain.handle('oday:backup:test-folder', async (_event, folderPath: string) => {
    const folder = normalizePath(folderPath);
    if (!folder) throw new Error('مسار غير صالح');
    await validateWritable(folder);
    return { ok: true, path: folder };
  });

  ipcMain.handle(
    'oday:backup:write-file',
    async (_event, payload: { folder: string; name: string; data: string }) => {
      const folder = normalizePath(payload.folder);
      if (!folder || !payload.name) throw new Error('invalid_payload');
      await validateWritable(folder);
      const target = path.join(folder, path.basename(payload.name));
      await writeFile(target, Buffer.from(payload.data, 'base64'));
      return { ok: true, path: target };
    },
  );
}
