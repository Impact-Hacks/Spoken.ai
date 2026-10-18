import { Router } from 'express';
import { providersToCall } from '../data/providers.js';
import { isSessionId, loadSession, loadSessionFile, saveSession } from '../lib/file-store.js';

const router = Router();

function fail(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

// Stores both answers (each must be one of the saved options) and the call category.
router.post('/', async (req, res) => {
  const { sessionId, answers } = req.body || {};
  const session = isSessionId(sessionId) ? await loadSession(sessionId) : null;
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', 'That request has expired. Start again.');
  if (await loadSessionFile(sessionId, 'state.json')) {
    return fail(res, 409, 'CALLS_STARTED', 'Calls have already started for this request.');
  }

  const clean = {};
  for (const q of session.questions) {
    const answer = answers?.[q.id];
    if (typeof answer !== 'string' || !q.options.includes(answer)) {
      return fail(res, 422, 'ANSWER_INVALID', 'Answer both questions to continue.');
    }
    clean[q.id] = answer;
  }

  session.answers = clean;
  session.serviceCategory = session.suggestedService;
  session.answersVersion = (session.answersVersion || 0) + 1;
  await saveSession(sessionId, session);

  const providerCount = providersToCall(session.serviceCategory).length;
  return res.json({ readyToCall: providerCount > 0, serviceCategory: session.serviceCategory, providerCount });
});

export default router;
