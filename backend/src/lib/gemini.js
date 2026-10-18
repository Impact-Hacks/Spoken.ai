// Gemini REST client. The API key stays on the server and is never logged.

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const INTAKE_TIMEOUT_MS = 8000;
const EXTRACT_TIMEOUT_MS = 20000;

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

async function generate(parts, schema, timeoutMs) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiUnavailableError('GEMINI_API_KEY is not set');

  let res;
  try {
    res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(timeoutMs),
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
    const out = await generate(parts, INTAKE_SCHEMA, INTAKE_TIMEOUT_MS);
    if (validIntake(out)) return out;
  }
  throw new GeminiUnavailableError('Gemini returned invalid questions twice');
}

const OFFER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    outcome: { type: 'STRING', enum: ['quoted', 'no_quote', 'cannot_help', 'voicemail', 'no_answer'] },
    priceBasis: { type: 'STRING', enum: ['fixed_job', 'estimate', 'hourly', 'inspection_only', 'no_quote'] },
    initialAmount: { type: 'NUMBER', nullable: true, description: 'First price the provider stated, USD.' },
    finalAmount: { type: 'NUMBER', nullable: true, description: 'Last price the provider agreed to, USD.' },
    minimumHours: { type: 'NUMBER', nullable: true },
    includedWork: { type: 'STRING', description: 'What the price covers, short. Empty if unknown.' },
    extraFees: { type: 'STRING', description: 'Extra or excluded charges, short. Empty if none stated.' },
    slots: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'YYYY-MM-DD' },
          window: { type: 'STRING', description: 'Arrival window written compactly, e.g. "9–11 AM", "1–3 PM", "10 AM–12 PM".' },
          timeZone: { type: 'STRING', description: 'Abbreviation such as ET. Empty if never stated.' },
        },
        required: ['date', 'window', 'timeZone'],
      },
    },
  },
  required: ['outcome', 'priceBasis', 'initialAmount', 'finalAmount', 'minimumHours', 'includedWork', 'extraFees', 'slots'],
};

function offerPrompt(transcriptText, providerName, today) {
  return `Below is a phone call between Sam (an AI assistant asking for a repair quote) and ${providerName}.
Today is ${today}.

Extract only what the provider actually said. Never invent a number.
- outcome: "quoted" if they gave any price (including an hourly rate or inspection fee); "no_quote" if they would not price it; "cannot_help" if they cannot do the job; "voicemail" or "no_answer" if nobody real answered.
- priceBasis: fixed_job (complete job, fixed), estimate (subject to inspection), hourly, inspection_only, or no_quote.
- initialAmount is the first price they stated; finalAmount is the last price they agreed to after any negotiation. Hourly prices are per hour. Use null when unknown.
- slots: each appointment window they offered, resolved to a calendar date. Leave timeZone empty if they never said one.

Transcript:
"""
${transcriptText}
"""`;
}

/** Extracts the provider's offer from a finished call transcript. */
export async function extractOffer({ transcriptText, providerName }) {
  const today = new Date().toISOString().slice(0, 10);
  const parts = [{ text: offerPrompt(transcriptText, providerName, today) }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generate(parts, OFFER_SCHEMA, EXTRACT_TIMEOUT_MS);
    if (out && typeof out.outcome === 'string' && Array.isArray(out.slots)) return out;
  }
  throw new GeminiUnavailableError('Gemini returned an invalid offer twice');
}
