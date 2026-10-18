// In-process call runner. One run per session: dials each matched provider through
// ElevenLabs (or a mock in CALL_MODE=simulated), polls each conversation until it ends,
// saves the transcript, extracts the offer with Gemini, then writes the comparison.
//
// Calls run one after another, in provider order, even when they go to different numbers.

import { demoPhoneFor, providersFor, providersToCall, SERVICE_LABELS } from './data/providers.js';
import { getConversation, startOutboundCall } from './lib/elevenlabs.js';
import { extractOffer } from './lib/gemini.js';
import { mockConversation } from './lib/mock.js';
import { normalizeTranscript, transcriptText } from './lib/transcripts.js';
import { compareOffers } from './lib/compare.js';
import { listSessionIds, loadSession, loadSessionFile, saveSessionFile } from './lib/file-store.js';

const POLL_MS = 4000;
const CALL_DEADLINE_MS = 12 * 60 * 1000;
const GAP_BETWEEN_CALLS_MS = 5000;

const STATUS_MAP = {
  initiated: 'ringing',
  'in-progress': 'live',
  processing: 'wrapping-up',
  done: 'done',
  failed: 'failed',
};
const TERMINAL = new Set(['done', 'failed']);

const running = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const callMode = () => (process.env.CALL_MODE === 'live' ? 'live' : 'simulated');

export function newCallState(session) {
  return {
    status: 'processing',
    mode: callMode(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    calls: providersToCall(session.serviceCategory).map((p) => ({
      callId: p.id,
      providerId: p.id,
      status: 'queued',
      conversationId: null,
      callSid: null,
      startedAt: null,
      endedAt: null,
      analysis: 'pending',
      error: null,
    })),
  };
}

function dynamicVariables(session, provider) {
  const budget = Number(session.budget);
  const target = Number.isFinite(budget) && budget > 0 ? Math.min(provider.listedMin, budget) : provider.listedMin;
  const needs = session.questions
    .map((q) => `${q.text} ${session.answers?.[q.id] || 'not specified'}`)
    .join('\n');
  return {
    customer_name: session.customerName || 'a customer',
    provider_name: provider.name,
    service: SERVICE_LABELS[session.serviceCategory] || session.serviceCategory,
    issue_description: session.issueDescription,
    image_observations: session.observations?.map((o) => `- ${o.text}`).join('\n') || 'none',
    needs,
    budget: Number.isFinite(budget) ? String(budget) : 'not specified',
    listed_min: String(provider.listedMin),
    listed_max: String(provider.listedMax),
    listing_basis: provider.listingBasis,
    negotiation_target: String(target),
    max_negotiation_attempts: '2',
    verified_history: 'none',
  };
}

async function runCall(ctx, call, index) {
  const { sessionId, session, state, persist } = ctx;
  const provider = providersFor(session.serviceCategory).find((p) => p.id === call.providerId);
  const log = (msg) => console.log(`[calls] ${sessionId.slice(0, 8)} ${provider.name}: ${msg}`);

  // 1. Dial, unless a previous run already did.
  if (!call.conversationId && !TERMINAL.has(call.status)) {
    if (call.status === 'dialing') {
      // Interrupted mid-start: the call may or may not exist, so never dial twice.
      Object.assign(call, { status: 'failed', error: 'interrupted while dialing' });
    } else if (state.mode === 'live') {
      const toNumber = demoPhoneFor(provider);
      call.status = 'dialing';
      call.startedAt = new Date().toISOString();
      await persist();
      try {
        const { conversationId, callSid } = await startOutboundCall({
          toNumber,
          dynamicVariables: dynamicVariables(session, provider),
        });
        Object.assign(call, { conversationId, callSid, status: 'ringing' });
        log(`dialing, conversation ${conversationId}`);
      } catch (err) {
        Object.assign(call, { status: 'failed', error: err.message });
        log(`could not start call: ${err.message}`);
      }
    } else {
      Object.assign(call, {
        conversationId: `sim-${sessionId.slice(0, 8)}-${call.callId}`,
        status: 'ringing',
        startedAt: new Date().toISOString(),
      });
    }
    await persist();
  }

  // 2. Wait for the conversation to end.
  let conversation = null;
  if (call.conversationId) {
    if (state.mode === 'simulated') {
      for (const status of ['ringing', 'live', 'wrapping-up']) {
        call.status = status;
        await persist();
        await sleep(status === 'live' ? 3000 : 1500);
      }
      conversation = mockConversation({ index, provider, issue: session.issueDescription, conversationId: call.conversationId });
      call.status = 'done';
    } else {
      const deadline = new Date(call.startedAt || Date.now()).getTime() + CALL_DEADLINE_MS;
      while (true) {
        try {
          conversation = await getConversation(call.conversationId);
        } catch (err) {
          log(`poll failed: ${err.message}`);
        }
        const status = conversation ? STATUS_MAP[conversation.status] : call.status;
        if (status && status !== call.status) {
          call.status = status;
          log(status);
          await persist();
        }
        if (TERMINAL.has(call.status)) break;
        if (Date.now() > deadline) {
          Object.assign(call, { status: 'failed', error: 'timed out waiting for the call to end' });
          break;
        }
        await sleep(POLL_MS);
      }
    }
    call.endedAt = new Date().toISOString();
    await persist();
  }

  // 3. Save the transcript and extract the offer.
  if (call.analysis !== 'pending') return;
  if (call.status !== 'done' || !conversation) {
    call.analysis = 'skipped';
    return persist();
  }

  const transcript = normalizeTranscript(conversation);
  const text = transcriptText(transcript);
  await saveSessionFile(sessionId, `calls/${call.callId}/transcript.json`, transcript);
  await saveSessionFile(sessionId, `calls/${call.callId}/transcript.txt`, text);

  let analysis;
  if (!transcript.turns.some((t) => t.role === 'provider')) {
    analysis = { outcome: 'no_answer', priceBasis: 'no_quote', slots: [] };
  } else {
    try {
      analysis = await extractOffer({ transcriptText: text, providerName: provider.name });
    } catch (err) {
      log(`offer extraction failed: ${err.message}`);
    }
  }
  if (analysis) await saveSessionFile(sessionId, `calls/${call.callId}/analysis.json`, analysis);
  call.analysis = analysis ? 'done' : 'failed';
  log(`analysis ${call.analysis}${analysis ? ` (${analysis.outcome}, ${analysis.priceBasis})` : ''}`);
  await persist();
}

async function finish(ctx) {
  const { sessionId, session, state, persist } = ctx;
  const providers = providersFor(session.serviceCategory);
  const calls = [];
  for (const call of state.calls) {
    calls.push({
      provider: providers.find((p) => p.id === call.providerId),
      status: call.status,
      analysis: await loadSessionFile(sessionId, `calls/${call.callId}/analysis.json`),
      analysisFailed: call.analysis === 'failed',
    });
  }
  await saveSessionFile(sessionId, 'comparison.json', compareOffers(calls));
  state.status = state.calls.some((c) => c.status === 'done') ? 'ready' : 'failed';
  state.finishedAt = new Date().toISOString();
  await persist();
  console.log(`[calls] ${sessionId.slice(0, 8)} finished: ${state.status}`);
}

/** Runs (or resumes) every call for a session. Safe to call twice; the second is a no-op. */
export async function runSession(sessionId) {
  if (running.has(sessionId)) return;
  running.add(sessionId);
  try {
    const session = await loadSession(sessionId);
    const state = await loadSessionFile(sessionId, 'state.json');
    if (!session || !state || state.status !== 'processing') return;

    const persist = () => saveSessionFile(sessionId, 'state.json', state);
    const ctx = { sessionId, session, state, persist };

    for (const [index, call] of state.calls.entries()) {
      const dialsNow = !call.conversationId && call.status === 'queued';
      if (index > 0 && dialsNow && state.mode === 'live') await sleep(GAP_BETWEEN_CALLS_MS);
      await runCall(ctx, call, index);
    }
    await finish(ctx);
  } catch (err) {
    console.error(`[calls] ${sessionId.slice(0, 8)} run failed:`, err);
  } finally {
    running.delete(sessionId);
  }
}

/** On boot, pick up sessions that were mid-call when the server stopped. */
export async function resumeUnfinished() {
  for (const sessionId of await listSessionIds()) {
    const state = await loadSessionFile(sessionId, 'state.json').catch(() => null);
    if (state?.status === 'processing') {
      console.log(`[calls] resuming ${sessionId.slice(0, 8)}`);
      runSession(sessionId);
    }
  }
}
