import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { demoEmailFor, findProvider } from '../data/providers.js';
import { calendarFile, slotFromLabel } from '../lib/calendar.js';
import { EmailError, providerEmail, sendEmail } from '../lib/email.js';
import { isSessionId, loadSession, loadSessionFile, saveSessionFile } from '../lib/file-store.js';

const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// clientRequestId -> response, so a retried tap never sends a second email.
const completed = new Map();
// clientRequestId -> { bookingId, createdAt } for sends not yet confirmed. A retry reuses them so
// the email payload matches the first attempt; Resend rejects a reused idempotency key otherwise.
const pending = new Map();

function fail(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

const text = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Emails the booking request to the provider (the PROVIDER_EMAIL teammate address). Sending
 * it does not confirm the appointment; the provider replies to the customer to confirm.
 * With a sessionId, the offer, slot and issue come from that session's results. Without
 * one (booking-screen testing), the client's offer summary is used as is.
 */
router.post('/', async (req, res) => {
  const { sessionId, providerId, slot, price, terms, issue, clientRequestId } = req.body || {};
  if (clientRequestId && completed.has(clientRequestId)) return res.status(202).json(completed.get(clientRequestId));

  const provider = findProvider(providerId);
  if (!provider) return fail(res, 422, 'PROVIDER_INVALID', 'Choose a provider.');
  const to = demoEmailFor(provider);
  if (!to) {
    console.error('[bookings] PROVIDER_EMAIL is not set');
    return fail(res, 503, 'EMAIL_NOT_CONFIGURED', "Booking email isn't set up on the server yet.");
  }

  const c = req.body.customer || {};
  const customer = {
    name: text(c.name, 80),
    phone: text(c.phone, 40),
    address: text(c.address),
    unit: text(c.unit, 40),
    zip: text(c.zip, 10),
    email: text(c.email, 120),
  };
  if (!EMAIL.test(customer.email)) return fail(res, 422, 'EMAIL_INVALID', 'Enter a valid email address.');

  const attempt = (clientRequestId && pending.get(clientRequestId)) || { bookingId: randomUUID(), createdAt: new Date().toISOString() };
  if (clientRequestId) pending.set(clientRequestId, attempt);
  let booking = {
    ...attempt,
    provider,
    slot: text(slot, 80),
    price: text(price, 80),
    terms: text(terms, 300),
    issue: text(issue, 500),
    customer,
  };
  if (sessionId) {
    const session = isSessionId(sessionId) ? await loadSession(sessionId) : null;
    const offer = (await loadSessionFile(sessionId, 'comparison.json'))?.offers?.find((o) => o.id === provider.id);
    if (!session || !offer) return fail(res, 404, 'OFFER_NOT_FOUND', 'That offer is no longer available.');
    if (!offer.slots.includes(booking.slot)) return fail(res, 422, 'SLOT_INVALID', 'Choose one of the offered times.');
    const slotTime = offer.slotTimes?.[offer.slots.indexOf(booking.slot)];
    booking = { ...booking, price: offer.priceLong, terms: offer.detail || '', issue: session.issueDescription, slotTime };
  }
  if (!booking.slot) return fail(res, 422, 'SLOT_INVALID', 'Choose one of the offered times.');
  booking.slotTime ||= slotFromLabel(booking.slot);

  try {
    await sendEmail({
      to,
      replyTo: customer.email,
      idempotencyKey: clientRequestId ? text(clientRequestId, 100) : booking.bookingId,
      ...providerEmail(booking),
      // No calendar file when the slot can't be dated; the email still carries the time.
      attachments: booking.slotTime
        ? [{ filename: 'appointment.ics', content: Buffer.from(calendarFile(booking)).toString('base64') }]
        : [],
    });
  } catch (err) {
    console.error(`[bookings] provider email failed: ${err.message}`);
    if (!(err instanceof EmailError)) throw err;
    return fail(res, 502, 'EMAIL_FAILED', "We couldn't send your request. Try again.");
  }
  console.log(`[bookings] request ${booking.bookingId.slice(0, 8)} sent to ${provider.name}`);

  const response = {
    bookingId: booking.bookingId,
    requestStatus: 'submitted',
    appointmentStatus: 'awaiting_provider',
  };
  if (sessionId) {
    await saveSessionFile(sessionId, `bookings/${booking.bookingId}.json`, { ...response, providerId: provider.id, slot: booking.slot, price: booking.price, createdAt: booking.createdAt });
  }
  if (clientRequestId) {
    pending.delete(clientRequestId);
    completed.set(clientRequestId, response);
  }
  return res.status(202).json(response);
});

export default router;
