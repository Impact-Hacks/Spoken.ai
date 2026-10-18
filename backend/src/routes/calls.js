import { Router } from 'express';
import { demoPhoneFor, providersToCall } from '../data/providers.js';
import { isSessionId, loadSession, loadSessionFile, saveSession, saveSessionFile } from '../lib/file-store.js';
import { callMode, newCallState, runSession } from '../worker.js';

const router = Router();
// Sessions whose start request is in flight, so a double tap cannot create two runs.
const starting = new Set();

function fail(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

function liveConfigProblem(providers) {
  const missing = ['ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID', 'ELEVENLABS_AGENT_PHONE_NUMBER_ID'].filter(
    (name) => !process.env[name]
  );
  if (!providers.every(demoPhoneFor)) missing.push('DEMO_PHONES');
  return missing.length ? `missing ${missing.join(', ')}` : null;
}

// The only call trigger. Destinations come from DEMO_PHONES, never from the client.
router.post('/', async (req, res) => {
  const { sessionId, customerName } = req.body || {};
  const session = isSessionId(sessionId) ? await loadSession(sessionId) : null;
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', 'That request has expired. Start again.');

  if (starting.has(sessionId)) return res.status(202).json({ status: 'processing' });
  const existing = await loadSessionFile(sessionId, 'state.json');
  if (existing) {
    return res.status(202).json({ status: existing.status, providerCount: existing.calls.length });
  }

  if (!session.answers) return fail(res, 409, 'ANSWERS_REQUIRED', 'Answer both questions first.');
  const providers = providersToCall(session.serviceCategory);
  if (!providers.length) return fail(res, 409, 'NO_PROVIDERS', 'There are no providers for this service yet.');

  if (callMode() === 'live') {
    const problem = liveConfigProblem(providers);
    if (problem) {
      console.error(`[calls] live calling is not configured: ${problem}`);
      return fail(res, 503, 'CALLS_NOT_CONFIGURED', "Calling isn't set up on the server yet.");
    }
  }

  starting.add(sessionId);
  try {
    // First name only: Sam introduces itself as calling on this person's behalf.
    const firstName = typeof customerName === 'string' ? customerName.trim().split(/\s+/)[0].slice(0, 40) : '';
    session.customerName = firstName || null;
    await saveSession(sessionId, session);
    await saveSessionFile(sessionId, 'state.json', newCallState(session));
  } finally {
    starting.delete(sessionId);
  }
  runSession(sessionId);

  return res.status(202).json({ status: 'processing', providerCount: providers.length });
});

export default router;
