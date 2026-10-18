// Resend client and the fixed booking-request template (no model-written mail).
// The API key is never logged.

const API = 'https://api.resend.com/emails';
const TIMEOUT_MS = 15000;
// Resend's shared test sender; it only delivers to the Resend account's own address.
const DEFAULT_FROM = 'CallAi <onboarding@resend.dev>';

export class EmailError extends Error {}

/**
 * Sends one email. idempotencyKey makes a retried send return the first result, as long as the
 * payload is identical. attachments: [{ filename, content (base64) }]. Returns the Resend id.
 */
export async function sendEmail({ to, subject, text, html, replyTo, attachments, idempotencyKey }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailError('RESEND_API_KEY is not set');

  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length ? { attachments } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new EmailError(err.name === 'TimeoutError' ? 'Resend timed out' : 'Resend request failed');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new EmailError(`Resend ${res.status}: ${data?.message || 'error'}`);
  return data?.id || null;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function render(intro, rows, outro) {
  const text = [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', outro].join('\n');
  const html = `<p>${escapeHtml(intro)}</p>
<table cellpadding="6" style="border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="color:#5D6058">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('\n')}
</table>
<p>${escapeHtml(outro)}</p>`;
  return { text, html };
}

/**
 * booking: { bookingId, provider, slot, price, terms, issue, customer: { name, phone, address, unit, zip, email } }
 * slot carries its time zone (e.g. "Tue, Oct 20 · 9–11 AM ET"). Reply-To is the customer so the
 * provider answers them directly.
 */
export function providerEmail(booking) {
  const { customer } = booking;
  const address = [customer.address, customer.unit].filter(Boolean).join(', ') + (customer.zip ? ` ${customer.zip}` : '');
  const rows = [
    ['Requested time', booking.slot],
    ['Quoted price', booking.price],
    ...(booking.terms ? [['Quoted terms', booking.terms]] : []),
    ...(booking.issue ? [['Problem', booking.issue]] : []),
    ['Customer', customer.name],
    ['Phone', customer.phone],
    ['Service address', address],
    ['Email', customer.email],
    ['Request ID', booking.bookingId],
  ];
  return {
    subject: `Appointment request: ${booking.slot}`,
    ...render(
      `Hello ${booking.provider.name}, ${customer.name || 'a customer'} would like to book the appointment you discussed with our AI assistant, Sam.`,
      rows,
      'This is a request, not a confirmed booking. Please reply to confirm this time or suggest another one.'
    ),
  };
}
