import { blobToBase64 } from './api/client';
import { getDesktop, isDesktop } from './desktop';

export function fileFromPicker(picked) {
  if (!picked) return null;
  const bytes = Uint8Array.from(atob(picked.data), (char) => char.charCodeAt(0));
  return new File([bytes], picked.name, { type: picked.mime || 'application/octet-stream' });
}

export async function openOrSaveBlob(blob, name, { print = false } = {}) {
  const fileName = name || 'oday-file';
  const bridge = getDesktop();
  if (isDesktop() && bridge) {
    const data = await blobToBase64(blob);
    if (print) {
      await bridge.print.pdf({ data, name: fileName });
      return;
    }
    if (blob.type.includes('pdf')) {
      await bridge.print.open({ data, name: fileName });
      return;
    }
    await bridge.files.save({ name: fileName, data, mime: blob.type });
    return;
  }

  const url = URL.createObjectURL(blob);
  if (print && blob.type.includes('pdf')) {
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = url;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.print();
    };
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function openWhatsApp(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return;
  const url = `https://wa.me/${digits}`;
  const bridge = getDesktop();
  if (isDesktop() && bridge?.shell) bridge.shell.open(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export function openEmail(email) {
  if (!email) return;
  const url = `mailto:${email}`;
  const bridge = getDesktop();
  if (isDesktop() && bridge?.shell) bridge.shell.open(url);
  else window.location.href = url;
}

export async function pickNativeFile() {
  const bridge = getDesktop();
  if (isDesktop() && bridge?.files) {
    const picked = await bridge.files.open();
    return fileFromPicker(picked);
  }
  return null;
}
