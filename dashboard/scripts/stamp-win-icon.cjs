const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

module.exports = async function stampWinIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icon = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const rcedit = path.join(__dirname, 'rcedit-x64.exe');

  if (!existsSync(exe)) throw new Error(`ODAY OS exe not found: ${exe}`);
  if (!existsSync(icon)) throw new Error(`Windows icon not found: ${icon}`);
  if (!existsSync(rcedit)) throw new Error(`rcedit not found: ${rcedit}`);

  execFileSync(rcedit, [
    exe,
    '--set-icon',
    icon,
    '--set-version-string',
    'FileDescription',
    'ODAY OS',
    '--set-version-string',
    'ProductName',
    'ODAY OS',
    '--set-version-string',
    'CompanyName',
    'عدي أبو ضحى',
    '--set-version-string',
    'InternalName',
    'ODAY OS',
    '--set-version-string',
    'OriginalFilename',
    'ODAY OS.exe',
  ], { stdio: 'inherit' });

  console.log(`stamped Windows icon onto ${exe}`);
};
