import { dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OPEN_FILTERS = [
  { name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'dwg', 'dxf', 'zip'] },
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
  { name: 'All files', extensions: ['*'] },
];

export function registerFilesIpc() {
  ipcMain.handle('oday:files:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: OPEN_FILTERS,
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const buffer = await readFile(filePath);
    return {
      name: path.basename(filePath),
      mime: mimeFromName(filePath),
      size: buffer.byteLength,
      data: buffer.toString('base64'),
    };
  });

  ipcMain.handle('oday:files:save', async (_event, payload: { name?: string; data: string; mime?: string }) => {
    const name = payload?.name || 'oday-file';
    const result = await dialog.showSaveDialog({
      defaultPath: name,
    });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, Buffer.from(payload.data, 'base64'));
    return true;
  });
}

function mimeFromName(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
}
