// Gemini REST client. The API key stays on the server and is never logged.

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 8000;

export const CATEGORIES = ['electrical_appliances', 'plumbing', 'vehicle', 'carpentry'];

export class GeminiUnavailableError extends Error {}

const INTAKE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    imageUsable: {
      type: 'BOOLEAN',
      description: 'False if the photo is too dark, blurry, or does not show anything repairable.',
    },
    retakeReason: { type: 'STRING', description: 'Short, plain advice for a retake. Empty if usable.' },
    observations: {
      type: 'ARRAY',
      description: 'Concrete things visible in the photo, each a short phrase.',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, text: { type: 'STRING' } },
        required: ['id', 'text'],
      },
    },
    suggestedService: { type: 'STRING', enum: CATEGORIES },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          observationRefs: { type: 'ARRAY', items: { type: 'STRING' } },
          purpose: { type: 'STRING' },
        },
        required: ['text', 'options', 'observationRefs', 'purpose'],
      },
    },
  },
  required: ['imageUsable', 'retakeReason', 'observations', 'suggestedService', 'questions'],
};

function intakePrompt(issue, budget) {
  return `You help a person who cannot make phone calls get a repair quote. An AI assistant will later phone repair providers for them.

The user wrote: """${issue}"""
Their maximum budget is $${budget}.

Look at the photo together with the text.
1. List concrete observations visible in the photo (ids "o1", "o2", ...). Describe what you see; do not diagnose.
2. Pick the single service category for the object and work the user needs (not a background object). An appliance leak is electrical_appliances, not plumbing.
3. Write exactly TWO multiple-choice questions whose answers would most help a provider quote this job.
   - Ground each question in at least one observation and list those ids in observationRefs.
   - Do not ask anything already clear from the photo or the text.
   - Give each question 2 or 3 short options. Include "I'm not sure" as an option when the user might not know.
   - Keep question text under 90 characters, plain language, no jargon.
   - "purpose" is one short sentence explaining why you ask.
If the photo is unusable (too dark, blurry, unrelated, or shows nothing to repair), set imageUsable to false, give a retakeReason, and return an empty questions list.`;
}

function validIntake(out) {
  if (!out || typeof out.imageUsable !== 'boolean') return false;
  if (!out.imageUsable) return true;
  if (!CATEGORIES.includes(out.suggestedService)) return false;
  if (!Array.isArray(out.questions) || out.questions.length !== 2) return false;
  return out.questions.every(
    (q) =>
      typeof q.text === 'string' &&
      q.text.trim() &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.length <= 3 &&
      q.options.every((o) => typeof o === 'string' && o.trim()) &&
      new Set(q.options).size === q.options.length
  );
}

async function generate(parts, schema) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiUnavailableError('GEMINI_API_KEY is not set');

  let res;
  try {
    res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    });
  } catch (err) {
    throw new GeminiUnavailableError(err.name === 'TimeoutError' ? 'Gemini timed out' : 'Gemini request failed');
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new GeminiUnavailableError(`Gemini ${res.status}: ${body?.error?.status || 'error'}`);
  }
  const text = body?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Reads the photo and the written issue and returns image observations, one
 * category and exactly two grounded questions (or imageUsable: false).
 * Retries once if the model's output does not validate.
 */
export async function analyzeIntake({ imageBase64, mimeType, issue, budget }) {
  const parts = [
    { inline_data: { mime_type: mimeType, data: imageBase64 } },
    { text: intakePrompt(issue, budget) },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generate(parts, INTAKE_SCHEMA);
    if (validIntake(out)) return out;
  }
  throw new GeminiUnavailableError('Gemini returned invalid questions twice');
}
