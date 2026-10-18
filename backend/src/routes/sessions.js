import { Router } from 'express';
import { isSessionId, loadSessionFile } from '../lib/file-store.js';

const router = Router();

async function loadState(req, res) {
  const { sessionId } = req.params;
  const state = isSessionId(sessionId) ? await loadSessionFile(sessionId, 'state.json') : null;
  if (!state) res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'No calls for this request.' });
  return state;
}

// Progress only: no provider names, numbers or transcript content.
router.get('/:sessionId/status', async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  return res.json({
    status: state.status,
    calls: state.calls.map((c, i) => ({ n: i + 1, status: c.status })),
  });
});

router.get('/:sessionId/results', async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  if (state.status === 'processing') return res.status(202).json({ status: 'processing' });
  const comparison = await loadSessionFile(req.params.sessionId, 'comparison.json');
  return res.json({ status: state.status, ...comparison });
});

export default router;
