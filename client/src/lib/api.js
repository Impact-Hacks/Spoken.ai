import Constants from 'expo-constants';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const API_PORT = 4310;
const LONG_EDGE = 1024;

// EXPO_PUBLIC_API_URL wins. Otherwise, in development, reuse the laptop IP that
// Expo Go already uses for Metro, so a phone on the same Wi-Fi reaches the API.
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:${API_PORT}`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function request(method, path, body, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      'NETWORK',
      controller.signal.aborted
        ? 'This is taking too long. Try again.'
        : "Can't reach the Spoken.ai server. Check it's running and your phone is on the same Wi-Fi."
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || `HTTP_${res.status}`, data?.message || 'Something went wrong. Try again.');
  }
  return data;
}

const post = (path, body) => request('POST', path, body);
const get = (path) => request('GET', path, null, 10000);

// Re-encode to a JPEG with a ~1024px long edge; this also bakes in EXIF orientation.
async function encodePhoto(photo) {
  const ctx = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width || 0, photo.height || 0) > LONG_EDGE) {
    ctx.resize(photo.width >= photo.height ? { width: LONG_EDGE } : { height: LONG_EDGE });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return out.base64;
}

export const newRequestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Sends the photo, issue and budget. Returns { sessionId, suggestedService, questions }. */
export async function submitIntake({ photo, issue, budget }) {
  const image = await encodePhoto(photo);
  return post('/api/intake', {
    image,
    issueDescription: issue.trim(),
    budget: Number(budget),
    clientRequestId: newRequestId(),
  });
}

/** Saves both answers. Returns { readyToCall, serviceCategory, providerCount }. */
export function submitAnswers({ sessionId, answers }) {
  return post('/api/answers', { sessionId, answers });
}

/** The only call trigger. Returns { status: 'processing', providerCount }. */
export function startCalls({ sessionId, customerName }) {
  return post('/api/call', { sessionId, customerName });
}

/** Returns { status: processing | ready | failed, calls: [{ n, status }] }. */
export function getCallStatus(sessionId) {
  return get(`/api/sessions/${sessionId}/status`);
}

/** Returns { status, offers, recommendedId } once calls are finished. */
export function getResults(sessionId) {
  return get(`/api/sessions/${sessionId}/results`);
}

/** Emails the booking request to the provider. Returns { bookingId, requestStatus, appointmentStatus }. */
export function sendBooking(booking) {
  return post('/api/bookings', booking);
}
