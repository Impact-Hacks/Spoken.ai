export const SERVICE_LABELS = {
  electrical_appliances: 'Electrical appliances',
  plumbing: 'Plumbing',
  vehicle: 'Vehicle',
  carpentry: 'Carpentry',
};

// Local stand-in until POST /api/answers returns Gemini's brief.
export function buildSummary(issue, questions, answers, budget) {
  const reported = questions
    .map((q) => answers[q.id])
    .filter((a) => a && a !== "I'm not sure")
    .map((a) => a.charAt(0).toLowerCase() + a.slice(1));
  const details = reported.length ? ` You add: ${reported.join('; ')}.` : '';
  return `You report: "${issue.trim()}"${details} I'll ask providers whether they can do the job, their earliest availability and the price, including call-out fees, and whether it can fit your $${budget} budget.`;
}
