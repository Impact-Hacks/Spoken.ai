import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR is relative to the repository root (e.g. "backend/data").
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.resolve(repoRoot, process.env.DATA_DIR || 'backend/data');

const SESSION_ID = /^[0-9a-f-]{36}$/;

function sessionFile(sessionId) {
  if (!SESSION_ID.test(sessionId)) throw new Error('Invalid session id');
  return path.join(dataDir, 'sessions', sessionId, 'session.json');
}

// Per-file write queue so concurrent writes to one session never interleave.
const queues = new Map();

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

export function saveSession(sessionId, session) {
  const file = sessionFile(sessionId);
  const prev = queues.get(file) || Promise.resolve();
  const next = prev.catch(() => {}).then(() => writeJsonAtomic(file, session));
  queues.set(file, next);
  return next;
}

export async function loadSession(sessionId) {
  try {
    return JSON.parse(await fs.readFile(sessionFile(sessionId), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
