// Demo offers from the design prototype. Replace with API responses once calls are live.

export const SERVICE_LABELS = {
  electrical_appliances: 'Electrical appliances',
  plumbing: 'Plumbing',
  vehicle: 'Vehicle',
  carpentry: 'Carpentry',
};

export const OFFERS = [
  {
    id: 'bluewave',
    name: 'Bluewave Plumbing',
    price: '$200',
    priceLong: '$200 fixed',
    detail: 'Fixed repair, labor and parts included · Negotiated down from $250',
    best: true,
    slots: ['Tue, Oct 20 · 9–11 AM ET', 'Wed, Oct 21 · 1–3 PM ET'],
  },
  {
    id: 'shellback',
    name: 'Shellback Repairs',
    price: '$90/hr',
    priceLong: '$90/hr, 2-hr minimum',
    detail: 'Hourly, 2-hour minimum, parts extra · Total unknown',
    slots: ['Wed, Oct 21 · 8–10 AM ET'],
  },
  {
    id: 'tidepool',
    name: 'Tidepool Plumbing',
    price: '$60',
    priceLong: '$60 inspection',
    detail: 'Inspection only · Repair priced after inspection',
    slots: ['Mon, Oct 19 · 4–6 PM ET', 'Thu, Oct 22 · 10 AM–12 PM ET'],
  },
  {
    id: 'kelp',
    name: 'Kelp Home Services',
    price: 'No clear price',
    detail: 'Would not quote over the phone',
    slots: [],
  },
];

// Local stand-in until POST /api/answers returns Gemini's brief.
export function buildSummary(issue, questions, answers, budget) {
  const reported = questions
    .map((q) => answers[q.id])
    .filter((a) => a && a !== "I'm not sure")
    .map((a) => a.charAt(0).toLowerCase() + a.slice(1));
  const details = reported.length ? ` You add: ${reported.join('; ')}.` : '';
  return `You report: "${issue.trim()}"${details} I'll ask providers whether they can do the job, their earliest availability and the price, including call-out fees, and whether it can fit your $${budget} budget.`;
}
