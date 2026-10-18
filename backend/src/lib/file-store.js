import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR is relative to the repository root (e.g. "backend/data").
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.resolve(repoRoot, process.env.DATA_DIR || 'backend/data');
const sessionsDir = path.join(dataDir, 'sessions');

const SESSION_ID = /^[0-9a-f-]{36}$/;
export const isSessionId = (id) => typeof id === 'string' && SESSION_ID.test(id);
const REL_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.(json|txt)$/;

// relPath is always chosen by server code (e.g. "state.json", "calls/<id>/transcript.txt").
function sessionPath(sessionId, relPath) {
  if (!SESSION_ID.test(sessionId)) throw new Error('Invalid session id');
  if (!REL_PATH.test(relPath)) throw new Error('Invalid session file path');
  return path.join(sessionsDir, sessionId, relPath);
}

// Per-file write queue so concurrent writes to one file never interleave.
const queues = new Map();

async function writeAtomic(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, contents);
  await fs.rename(tmp, file);
}

function enqueue(file, contents) {
  const prev = queues.get(file) || Promise.resolve();
  const next = prev.catch(() => {}).then(() => writeAtomic(file, contents));
  queues.set(file, next);
  return next;
}

export function saveSessionFile(sessionId, relPath, value) {
  const contents = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return enqueue(sessionPath(sessionId, relPath), contents);
}

export async function loadSessionFile(sessionId, relPath) {
  try {
    const text = await fs.readFile(sessionPath(sessionId, relPath), 'utf8');
    return relPath.endsWith('.json') ? JSON.parse(text) : text;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export const saveSession = (sessionId, session) => saveSessionFile(sessionId, 'session.json', session);
export const loadSession = (sessionId) => loadSessionFile(sessionId, 'session.json');

export async function listSessionIds() {
  try {
    return (await fs.readdir(sessionsDir)).filter((name) => SESSION_ID.test(name));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
