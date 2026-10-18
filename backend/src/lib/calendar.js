// The .ics file attached to the booking email. It is a tentative "add to calendar" event,
// not a meeting invite: the appointment is only a request until the provider replies.

const ZONES = {
  ET: 'America/New_York', EST: 'America/New_York', EDT: 'America/New_York',
  CT: 'America/Chicago', CST: 'America/Chicago', CDT: 'America/Chicago',
  MT: 'America/Denver', MST: 'America/Denver', MDT: 'America/Denver',
  PT: 'America/Los_Angeles', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
  AKT: 'America/Anchorage', HT: 'Pacific/Honolulu', HST: 'Pacific/Honolulu',
};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const RANGE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i;

const toMinutes = (h, m, meridiem) => ((Number(h) % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(m || 0);

/** "9–11 AM", "11–1 PM", "10 AM - 2:30 PM" -> { start, end } in minutes after midnight, or null. */
function parseWindow(window) {
  const m = window.trim().replace(/[–—]/g, '-').match(RANGE);
  if (!m) return null;
  const end = toMinutes(m[4], m[5], m[6]);
  let start = toMinutes(m[1], m[2], m[3] || m[6]);
  // "11–1 PM" means 11 AM to 1 PM.
  if (!m[3] && start >= end && start >= 720) start -= 720;
  return start < end ? { start, end } : null;
}

// How far the zone is ahead of UTC at that instant, in ms.
function zoneOffset(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const n = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  return Date.UTC(n.year, n.month - 1, n.day, n.hour, n.minute, n.second) - utcMs;
}

function localToUtc(date, minutes, timeZone) {
  const [y, mo, d] = date.split('-').map(Number);
  const local = Date.UTC(y, mo - 1, d, 0, minutes);
  return new Date(local - zoneOffset(local - zoneOffset(local, timeZone), timeZone));
}

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const floating = (date, minutes) =>
  `${date.replace(/-/g, '')}T${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`;
const nextDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
const escapeText = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

// Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1).
function fold(line) {
  const out = [];
  let current = '';
  for (const ch of line) {
    if (Buffer.byteLength(current + ch) > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
    }
    current += ch;
  }
  out.push(current);
  return out.join('\r\n ');
}

/**
 * Rebuilds { date, window, timeZone } from a display label such as "Tue, Oct 20 · 9–11 AM ET".
 * Used only when no structured slot is available (booking-screen testing, older sessions).
 */
export function slotFromLabel(label) {
  const m = String(label).match(/^[A-Za-z]{3}, ([A-Za-z]{3}) (\d{1,2}) · (.+)$/);
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (month < 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  let year = Number(today.slice(0, 4));
  const iso = (y) => `${y}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  if (iso(year) < today) year += 1;
  const words = m[3].split(' ');
  const timeZone = ZONES[words.at(-1)] ? words.pop() : '';
  return { date: iso(year), window: words.join(' '), timeZone };
}

/**
 * booking: the object providerEmail takes, plus slotTime { date, window, timeZone } and createdAt.
 * A window that parses becomes a timed event: in UTC when the zone is known, otherwise in floating
 * local time. Anything else ("morning") becomes an all-day event with the window in the title.
 */
export function calendarFile(booking) {
  const { slotTime, customer } = booking;
  const range = parseWindow(slotTime.window);
  const zone = ZONES[slotTime.timeZone?.toUpperCase()];
  let when;
  if (range && zone) {
    when = [`DTSTART:${stamp(localToUtc(slotTime.date, range.start, zone))}`, `DTEND:${stamp(localToUtc(slotTime.date, range.end, zone))}`];
  } else if (range) {
    when = [`DTSTART:${floating(slotTime.date, range.start)}`, `DTEND:${floating(slotTime.date, range.end)}`];
  } else {
    when = [`DTSTART;VALUE=DATE:${slotTime.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${nextDay(slotTime.date)}`];
  }

  const title = `Requested: ${customer.name || 'customer'} appointment${range ? '' : ` (${slotTime.window})`}`;
  const address = [customer.address, customer.unit].filter(Boolean).join(', ') + (customer.zip ? ` ${customer.zip}` : '');
  const description = [
    'Not confirmed until you reply to the request email.',
    booking.issue && `Problem: ${booking.issue}`,
    `Quoted price: ${booking.price}`,
    customer.phone && `Phone: ${customer.phone}`,
    `Email: ${customer.email}`,
    `Request ID: ${booking.bookingId}`,
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CallAi//Booking request//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.bookingId}@callai`,
    `DTSTAMP:${stamp(new Date(booking.createdAt))}`,
    ...when,
    `SUMMARY:${escapeText(title)}`,
    ...(address.trim() ? [`LOCATION:${escapeText(address)}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
