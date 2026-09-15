const fs = require('node:fs');
const path = require('node:path');

const dashboardRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(dashboardRoot, '..');
const releaseDir = path.join(dashboardRoot, 'release');
const targetDir = path.join(repoRoot, 'public', 'desktop-updates');
const pkg = JSON.parse(fs.readFileSync(path.join(dashboardRoot, 'package.json'), 'utf8'));

fs.mkdirSync(targetDir, { recursive: true });

if (!fs.existsSync(releaseDir)) {
  console.error('No dashboard/release folder. Run electron-builder first.');
  process.exit(1);
}

const copied = [];
for (const name of fs.readdirSync(releaseDir)) {
  const isInstaller = /\.(exe|dmg|zip|blockmap)$/i.test(name) && !/uninstaller/i.test(name);
  const isFeed = /^(latest|latest-mac|latest-linux)\.(yml|yaml)$/i.test(name);
  if (!isInstaller && !isFeed) continue;
  fs.copyFileSync(path.join(releaseDir, name), path.join(targetDir, name));
  copied.push(name);
}

const manifest = {
  available: true,
  version: pkg.version,
  name: pkg.productName || pkg.name,
  released_at: new Date().toISOString(),
  feed: '/desktop-updates',
  files: copied,
};

fs.writeFileSync(path.join(targetDir, 'version.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Published desktop update ${pkg.version} → public/desktop-updates (${copied.length} files)`);
