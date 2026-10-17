// Demo data from the design prototype. Replace with API responses once the backend is live.

export const SERVICE = 'Plumbing';

export const QUESTIONS = [
  {
    id: 'q1',
    text: 'Where does water first appear around the pictured pipe?',
    options: ['At a connection', 'Along the pipe', "I'm not sure"],
  },
  {
    id: 'q2',
    text: 'How is the leak behaving now?',
    options: ['Occasional drips', 'Continuous leaking', 'Not leaking right now'],
  },
];

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

export function buildSummary(answers, budget) {
  const { q1, q2 } = answers;
  const behavior = q2 ? q2.toLowerCase() : 'a leak';
  const where = q1 && q1 !== "I'm not sure" ? ' ' + q1.toLowerCase() : '';
  const budgetPart = budget ? `, and whether it can fit your $${budget} budget` : '';
  return `You report ${behavior}${where} under your kitchen sink. I'll ask plumbers whether they can repair it, their earliest availability and the price, including call-out fees${budgetPart}.`;
}
