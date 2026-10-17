import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { analyzeIntake, GeminiUnavailableError } from '../lib/gemini.js';
import { saveSession } from '../lib/file-store.js';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_ISSUE_CHARS = 2000;

// clientRequestId -> response, so a retried request returns the same session and questions.
const completed = new Map();

function fail(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

function detectImageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  return null;
}

const router = Router();

router.post('/', async (req, res) => {
  const { image, issueDescription, budget, clientRequestId } = req.body || {};

  if (clientRequestId && completed.has(clientRequestId)) {
    return res.status(201).json(completed.get(clientRequestId));
  }

  // Validate everything before calling Gemini.
  const issue = typeof issueDescription === 'string' ? issueDescription.trim() : '';
  if (!issue || issue.length > MAX_ISSUE_CHARS) {
    return fail(res, 422, 'ISSUE_REQUIRED', 'Describe the problem in 1 to 2,000 characters.');
  }
  const budgetValue = typeof budget === 'number' || typeof budget === 'string' ? Number(budget) : NaN;
  if (budget === '' || !Number.isFinite(budgetValue) || budgetValue <= 0) {
    return fail(res, 422, 'BUDGET_REQUIRED', 'Enter your maximum budget in dollars.');
  }
  if (typeof image !== 'string' || !image) {
    return fail(res, 422, 'IMAGE_REQUIRED', 'Add a photo of the problem.');
  }

  const base64 = image.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return fail(res, 422, 'INVALID_IMAGE', "We couldn't read that photo. Try another.");
  if (bytes.length > MAX_IMAGE_BYTES) return fail(res, 413, 'IMAGE_TOO_LARGE', 'That photo is too large.');
  const mimeType = detectImageType(bytes);
  if (!mimeType) return fail(res, 415, 'UNSUPPORTED_IMAGE', 'Use a JPEG or PNG photo.');

  let analysis;
  try {
    analysis = await analyzeIntake({ imageBase64: base64, mimeType, issue, budget: budgetValue });
  } catch (err) {
    if (err instanceof GeminiUnavailableError) {
      console.warn('[intake] image analysis unavailable:', err.message);
      return fail(res, 503, 'IMAGE_ANALYSIS_UNAVAILABLE', "We couldn't check your photo just now. Try again.");
    }
    throw err;
  }

  if (!analysis.imageUsable) {
    return fail(res, 422, 'IMAGE_UNCLEAR', analysis.retakeReason || 'Try a clearer photo of the problem.');
  }

  const sessionId = randomUUID();
  const questions = analysis.questions.map((q, i) => ({
    id: `q${i + 1}`,
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()),
    observationRefs: q.observationRefs,
    purpose: q.purpose,
  }));

  // Raw image bytes are not stored; only what Gemini observed.
  await saveSession(sessionId, {
    sessionId,
    createdAt: new Date().toISOString(),
    issueDescription: issue,
    budget: budgetValue,
    observations: analysis.observations,
    suggestedService: analysis.suggestedService,
    questions,
    answers: null,
  });

  const response = {
    sessionId,
    suggestedService: analysis.suggestedService,
    questions: questions.map(({ id, text, options, purpose }) => ({ id, text, options, purpose })),
  };
  if (clientRequestId) completed.set(clientRequestId, response);
  return res.status(201).json(response);
});

export default router;
