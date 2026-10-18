// Backend-only sample conversations for CALL_MODE=simulated. They have the same shape
// as an ElevenLabs conversation so the rest of the pipeline (transcripts, Gemini
// extraction, comparison) runs unchanged. Nobody is dialed.

function dayLabel(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const SCRIPTS = [
  // Fixed price, negotiated down once.
  (p) => [
    ['agent', `Hello! My name is Sam, an AI assistant calling on behalf of a customer. Have I reached ${p.name}?`],
    ['user', `Yes, this is ${p.name}.`],
    ['agent', 'Thank you. Is now a good time for a quick question about a repair?'],
    ['user', 'Sure, go ahead.'],
    ['agent', `The customer reports: ${p.issue} Is that something your team can help with?`],
    ['user', 'Yes, we do that kind of job all the time.'],
    ['agent', 'Great. What would the price be, and is that a fixed price for the complete job?'],
    ['user', "It'd be two hundred fifty dollars, fixed, parts and labor included."],
    ['agent', "Thank you. That's a little above what the customer was hoping for. Is there any flexibility with the same work included?"],
    ['user', 'I can do two hundred even.'],
    ['agent', 'That helps, thank you. What appointment times do you have available?'],
    ['user', `${dayLabel(3)} between 9 and 11 AM Eastern, or ${dayLabel(4)} from 1 to 3 PM Eastern.`],
    ['agent', `So that's two hundred dollars fixed, parts and labor included, with ${dayLabel(3)} 9 to 11 AM or ${dayLabel(4)} 1 to 3 PM Eastern. Have I understood that correctly?`],
    ['user', "That's right."],
  ],
  // Hourly with a minimum.
  (p) => [
    ['agent', `Hello! My name is Sam, an AI assistant calling on behalf of a customer. Have I reached ${p.name}?`],
    ['user', 'Yep.'],
    ['agent', `The customer reports: ${p.issue} Is that something your team can help with?`],
    ['user', 'We can. We charge ninety an hour, two hour minimum, parts are extra.'],
    ['agent', 'Is there any flexibility on the rate or the minimum?'],
    ['user', "No, sorry, that's our standard rate."],
    ['agent', 'Understood. When could someone come out?'],
    ['user', `${dayLabel(4)}, 8 to 10 in the morning, Eastern time.`],
    ['agent', `So ninety dollars an hour, two hour minimum, parts extra, on ${dayLabel(4)} 8 to 10 AM Eastern. Correct?`],
    ['user', 'Correct.'],
  ],
  // Inspection only.
  (p) => [
    ['agent', `Hello! My name is Sam, an AI assistant calling on behalf of a customer. Have I reached ${p.name}?`],
    ['user', 'You have.'],
    ['agent', `The customer reports: ${p.issue} Is that something your team can help with?`],
    ['user', "Probably, but I can't price the repair without seeing it. Inspection is sixty dollars, we quote the repair on site."],
    ['agent', 'Would the inspection fee be waived if they go ahead with the repair?'],
    ['user', "No, it's separate."],
    ['agent', 'Okay. What times are available for the inspection?'],
    ['user', `${dayLabel(2)} 4 to 6 PM, or ${dayLabel(5)} 10 to noon. Eastern.`],
    ['agent', `So a sixty dollar inspection, repair quoted on site, ${dayLabel(2)} 4 to 6 PM or ${dayLabel(5)} 10 AM to noon Eastern. Is that right?`],
    ['user', 'Yes.'],
  ],
  // No quote over the phone.
  (p) => [
    ['agent', `Hello! My name is Sam, an AI assistant calling on behalf of a customer. Have I reached ${p.name}?`],
    ['user', 'Yes.'],
    ['agent', `The customer reports: ${p.issue} Is that something your team can help with?`],
    ['user', "We don't give quotes over the phone, sorry. They'd need to come by."],
    ['agent', 'Understood, thank you for your time.'],
  ],
];

export function mockConversation({ index, provider, issue, conversationId }) {
  const lines = SCRIPTS[index % SCRIPTS.length]({ name: provider.name, issue });
  return {
    conversation_id: conversationId,
    status: 'done',
    metadata: { call_duration_secs: lines.length * 6, termination_reason: 'simulated' },
    transcript: lines.map(([role, message], i) => ({ role, message, time_in_call_secs: i * 6 })),
  };
}
