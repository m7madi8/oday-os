/** نظام عدي أبو ضحى — مزامنة لوحة التحكم أثناء التطوير. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.ODAY_DASHBOARD_TOKEN || process.env.VITE_ODAY_TOKEN || 'oday-office-sync';
const storePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/store.json');

function ensureStore() {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, '{}', 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(items) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(items, null, 2), 'utf8');
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function isValidKey(key) {
  return /^[A-Za-z0-9._-]{1,64}$/.test(key);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/oday')) return false;

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  const token = req.headers['x-oday-token'];
  if (token !== TOKEN) {
    send(res, 401, { message: 'unauthorized' });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/oday/items') {
    send(res, 200, { items: readStore() });
    return true;
  }

  const match = url.pathname.match(/^\/api\/oday\/items\/([^/]+)$/);
  if (!match) {
    send(res, 404, { message: 'not found' });
    return true;
  }

  const key = decodeURIComponent(match[1]);
  if (!isValidKey(key)) {
    send(res, 422, { message: 'invalid key' });
    return true;
  }

  if (req.method === 'GET') {
    const row = readStore()[key] || null;
    send(res, 200, { key, value: row?.value ?? null, updated_at: row?.updated_at ?? null });
    return true;
  }

  if (req.method === 'PUT') {
    let payload = {};
    try {
      payload = JSON.parse((await readBody(req)) || '{}');
    } catch {
      send(res, 422, { message: 'invalid json' });
      return true;
    }
    let value = payload.value;
    if (value == null) value = '';
    if (typeof value !== 'string') {
      send(res, 422, { message: 'value must be a string' });
      return true;
    }
    if (value.length > 200000) {
      send(res, 422, { message: 'value too large' });
      return true;
    }
    const updatedAt = Number(payload.updated_at) || Date.now();
    const items = readStore();
    const current = Number(items[key]?.updated_at) || 0;
    if (updatedAt >= current) {
      items[key] = { value, updated_at: updatedAt };
      writeStore(items);
    }
    send(res, 200, { key, value: items[key].value, updated_at: items[key].updated_at });
    return true;
  }

  send(res, 405, { message: 'method not allowed' });
  return true;
}

export function odaySyncPlugin() {
  return {
    name: 'oday-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!(await handle(req, res))) next();
        } catch (error) {
          next(error);
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!(await handle(req, res))) next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
