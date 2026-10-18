import { Router } from 'express';
import { providersToCall } from '../data/providers.js';
import { isSessionId, loadSession } from '../lib/file-store.js';

const router = Router();

// Count only; matched names and numbers stay on the server until results.
router.get('/', async (req, res) => {
  const { sessionId } = req.query;
  const session = isSessionId(sessionId) ? await loadSession(sessionId) : null;
  if (!session?.serviceCategory) {
    return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Answer the questions first.' });
  }
  const providerCount = providersToCall(session.serviceCategory).length;
  return res.json({
    providerCount,
    message: providerCount
      ? `I found ${providerCount} provider${providerCount === 1 ? '' : 's'} who may be able to help.`
      : "I couldn't find providers for this yet.",
  });
});

export default router;
