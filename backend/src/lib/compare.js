// Turns per-call extractions into the offers the results screen shows.
// Money is compared in integer cents. Only fixed complete-job prices are compared
// with each other; hourly, estimate and inspection prices are shown as tradeoffs.

const toCents = (usd) => (Number.isFinite(usd) && usd >= 0 ? Math.round(usd * 100) : null);

function money(cents) {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

const EXCLUSION_DETAIL = {
  no_quote: 'Would not quote over the phone',
  cannot_help: "Can't take this job",
  voicemail: 'Reached voicemail',
  no_answer: 'No answer',
  failed: 'Call did not connect',
  analysis_failed: 'Comparison unavailable for this call',
};

function slotLabels(slots) {
  const today = new Date().toISOString().slice(0, 10);
  return (slots || [])
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.date >= today && s.window)
    .map((s) => {
      const day = new Date(`${s.date}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return `${day} · ${s.window}${s.timeZone ? ` ${s.timeZone}` : ''}`;
    });
}

function describeOffer(provider, analysis) {
  const base = { id: provider.id, name: provider.name, best: false, slots: [] };
  const final = toCents(analysis?.finalAmount ?? analysis?.initialAmount);
  const initial = toCents(analysis?.initialAmount);

  if (!analysis || analysis.outcome !== 'quoted' || final === null || analysis.priceBasis === 'no_quote') {
    const reason = analysis?.outcome && analysis.outcome !== 'quoted' ? analysis.outcome : 'no_quote';
    return { ...base, price: 'No clear price', priceLong: 'No clear price', detail: EXCLUSION_DETAIL[reason], comparable: false };
  }

  const slots = slotLabels(analysis.slots);
  const notes = [];
  let price;
  let priceLong;
  let comparable = false;

  switch (analysis.priceBasis) {
    case 'fixed_job':
      price = money(final);
      priceLong = `${money(final)} fixed`;
      notes.push(analysis.includedWork ? `Fixed repair, ${analysis.includedWork}` : 'Fixed repair');
      if (initial !== null && initial > final) notes.push(`Negotiated down from ${money(initial)}`);
      comparable = true;
      break;
    case 'estimate':
      price = `~${money(final)}`;
      priceLong = `${money(final)} estimate`;
      notes.push('Estimate, subject to inspection');
      break;
    case 'hourly': {
      const hours = analysis.minimumHours;
      price = `${money(final)}/hr`;
      priceLong = hours ? `${money(final)}/hr, ${hours}-hr minimum` : `${money(final)}/hr`;
      notes.push(hours ? `Hourly, ${hours}-hour minimum` : 'Hourly', 'Total unknown');
      break;
    }
    case 'inspection_only':
      price = money(final);
      priceLong = `${money(final)} inspection`;
      notes.push('Inspection only', 'Repair priced after inspection');
      break;
    default:
      return { ...base, price: 'No clear price', priceLong: 'No clear price', detail: EXCLUSION_DETAIL.no_quote, comparable: false };
  }
  if (analysis.extraFees) notes.push(analysis.extraFees);

  return { ...base, price, priceLong, detail: notes.join(' · '), slots, comparable, finalCents: final };
}

/**
 * calls: [{ provider, status, analysis }]. Returns { offers, recommendedId }.
 * Offers keep call order; a recommendation is made only among fixed-price quotes with a slot.
 */
export function compareOffers(calls) {
  const offers = calls.map(({ provider, status, analysis, analysisFailed }) => {
    if (status === 'failed') return describeOffer(provider, { outcome: 'failed' });
    if (analysisFailed) return describeOffer(provider, { outcome: 'analysis_failed' });
    return describeOffer(provider, analysis);
  });

  const candidates = offers.filter((o) => o.comparable && o.slots.length);
  const best = candidates.reduce((a, b) => (!a || b.finalCents < a.finalCents ? b : a), null);
  if (best) best.best = true;

  return {
    recommendedId: best?.id || null,
    offers: offers.map(({ comparable, finalCents, ...o }) => o),
  };
}
