// Normalizes an ElevenLabs conversation payload (or a mock one of the same shape)
// into transcript.json turns and a readable transcript.txt.

export function normalizeTranscript(conversation) {
  const turns = (conversation?.transcript || [])
    .filter((t) => typeof t?.message === 'string' && t.message.trim())
    .map((t, i) => ({
      id: `t${i + 1}`,
      role: t.role === 'agent' ? 'agent' : 'provider',
      text: t.message.trim(),
      timeInCallSecs: Number.isFinite(t.time_in_call_secs) ? t.time_in_call_secs : null,
    }));
  return {
    conversationId: conversation?.conversation_id || null,
    status: conversation?.status || null,
    durationSecs: conversation?.metadata?.call_duration_secs ?? null,
    terminationReason: conversation?.metadata?.termination_reason || null,
    turns,
  };
}

export function transcriptText(transcript) {
  return transcript.turns.map((t) => `${t.role === 'agent' ? 'Sam' : 'Provider'}: ${t.text}`).join('\n');
}
