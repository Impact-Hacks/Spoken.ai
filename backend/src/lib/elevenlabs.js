// ElevenLabs Conversational AI client. ElevenLabs owns the call: it dials through the
// imported Twilio number and runs the Sam agent. The API key is never logged.

const API = 'https://api.elevenlabs.io/v1/convai';
const TIMEOUT_MS = 15000;

export class ElevenLabsError extends Error {}

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set');
  return key;
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey() },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new ElevenLabsError(err.name === 'TimeoutError' ? 'ElevenLabs timed out' : 'ElevenLabs request failed');
  }
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

function describe(data) {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => `${(d.loc || []).join('.')}: ${d.msg}`).join('; ');
  return detail?.message || data?.message || 'error';
}

/**
 * Starts one outbound call through the Twilio number imported into ElevenLabs.
 * dynamicVariables fill the {{placeholders}} in Sam's prompt and first message.
 * Returns { conversationId, callSid }.
 */
export async function startOutboundCall({ toNumber, dynamicVariables }) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;
  if (!agentId || !phoneNumberId) {
    throw new ElevenLabsError('ELEVENLABS_AGENT_ID and ELEVENLABS_AGENT_PHONE_NUMBER_ID must be set');
  }
  const { ok, status, data } = await request('POST', '/twilio/outbound-call', {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: toNumber,
    conversation_initiation_client_data: { dynamic_variables: dynamicVariables },
  });
  if (!ok || data?.success === false) {
    throw new ElevenLabsError(`outbound call ${status}: ${describe(data)}`);
  }
  const conversationId = data?.conversation_id;
  if (!conversationId) throw new ElevenLabsError('outbound call returned no conversation_id');
  return { conversationId, callSid: data.callSid || data.call_sid || null };
}

/**
 * Fetches a conversation. Returns null while ElevenLabs does not know it yet (404 right
 * after the call starts). status is initiated | in-progress | processing | done | failed.
 */
export async function getConversation(conversationId) {
  const { ok, status, data } = await request('GET', `/conversations/${encodeURIComponent(conversationId)}`);
  if (status === 404) return null;
  if (!ok) throw new ElevenLabsError(`get conversation ${status}: ${describe(data)}`);
  return data;
}
