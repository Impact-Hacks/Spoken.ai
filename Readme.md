# CallAi

CallAi lets someone who cannot use a spoken phone call submit a repair photo and a written issue, compare demo-provider offers, and email a booking request.

## Overview

CallAi is an accessibility-focused mobile app. A user submits a required repair image and a required written issue, answers two image-grounded questions, sees how many demo providers match, and taps **Call N providers**. The backend places simulated or live calls, analyzes transcripts, and returns a comparison. The user selects a provider and a time and sends a booking request without speaking on the phone.

The mobile client is Expo / React Native. The API is Node.js and Express, with one worker that finishes call analysis after `POST /api/call` returns. Gemini reads the image, writes the questions, builds the brief, extracts offer terms, and compares providers. In live mode, a Gemini model inside ElevenLabs speaks as **Sam**, and Twilio carries the phone connection. Resend sends the booking email. There is no login, no ZIP-code field, no database, and no web search for businesses.

This repository is a planning baseline. The app, API, and external integrations are not implemented here and have not been tested.

## Problem

Comparing repair prices usually means explaining the same leak, appliance, vehicle, or carpentry problem to several providers by phone. That call blocks people who cannot speak or cannot use spoken phone conversations. They can show the problem and write what is wrong. They still need scope, price, timing, and a way to request a time. CallAi keeps the user’s path in images, text, and taps, and moves the provider conversations to Sam.

## Architecture

These rows describe the planned design. None of these integrations are implemented in this repository.

| Component | Technology | Responsibility |
| --- | --- | --- |
| Mobile app | Expo / React Native | Required image and written issue, two questions, match count, call button, loading, comparison, booking |
| Backend | Node.js / Express | Validate intake, store session state, start calls, poll-ready results, send booking email |
| AI analysis | Gemini | Image findings, questions, service brief, category, transcript extraction, comparison |
| Live voice agent | ElevenLabs with Gemini | Sam’s spoken turns on a live call |
| Telephony | Twilio | Outbound phone connection for live calls |
| Email | Resend | One booking request to the selected demo address |
| Storage | Local JSON and text files | Sessions, transcripts, analysis, comparison, bookings |
| Database | None | No database client or schema |
| Authentication | None | A session ID groups files. It is not an access token |

The phone must reach the API over HTTPS. `localhost` on the laptop is not the phone’s localhost. `POST /api/call` returns `202` immediately. One worker then checks call completion, runs Gemini, and sends email. The app polls status and loads the comparison when it is ready. Signed ElevenLabs and Resend webhooks update local files only. They are not a path for transcripts to the phone.

```mermaid
flowchart LR
  MobileApp[Mobile App] --> Backend[Express Backend]
  Backend --> Gemini[Gemini]
  Backend --> Voice[ElevenLabs / Twilio]
  Backend --> Storage[Local JSON / Text Storage]
  Backend --> Resend[Resend]
```

## Core Flow

```text
Required image and written issue
→ two image-grounded questions
→ service brief and category
→ matching provider count
→ Call N providers
→ simulated or live calls
→ transcript analysis
→ final comparison
→ provider and time selection
→ booking request email
```

There is no ZIP input, no login, and no separate category-approval screen. A loading state sits between the call tap and the comparison.

1. The user takes or selects a required photo and types the issue. An optional nonnegative job budget can be included. Example: an under-sink pipe photo and “Water is leaking from the pipe under my kitchen sink.” Without a valid image, the flow stops.
2. `POST /api/intake` validates the image and text. Gemini sees both in one request and stores exactly two multiple-choice questions grounded in visible observations. Raw image bytes are then discarded. Intake never places a call.
3. The user taps one saved option for each question. `POST /api/answers` checks the options and stores a versioned brief and exactly one category. Calls stay off. Replacing answers invalidates the previous brief.
4. The summary states the user’s reported problem. It is not a diagnosis.
5. `GET /api/providers` returns only a count and a short message, such as “I found N providers who may be able to help.” The button reads **Call N providers**. Names and listing ranges stay hidden. N is the real match count. An empty category returns zero and disables the button.
6. **Call N providers** is the only call trigger. `POST /api/call` loads the brief and saved match IDs, resolves numbers from `DEMO_PHONES`, and starts one call per provider about one second apart. Repeated starts do not duplicate a session/provider call. The route returns `processing`.
7. The app shows “Calling providers and comparing offers” and polls `GET /api/sessions/:sessionId/status` about every three seconds, backing off on errors. Work continues if the app is backgrounded. Reopening the saved session ID loads completed results. The user never speaks or receives a call.
8. The worker writes transcripts, extracts terms, and compares offers. Failed calls appear as exclusions. The results screen shows names, scope, price basis, availability, negotiated reduction, and a recommendation only when comparable terms support one.
9. The user selects one provider and one saved future time, enters the service address and contact details as text, and taps **Send booking request**. That tap is the only send trigger.
10. Resend emails only that provider’s configured demo address. The app shows “Booking request sent — awaiting provider confirmation.” A sent or delivered email is not a confirmed appointment.

## Supported Service Categories

Gemini must return exactly one of these values. The same strings are prompt output, JSON validation, and directory keys.

| Category id | What it covers |
| --- | --- |
| `electrical_appliances` | Washing machines, refrigerators, ovens, fans, and other electrical household appliances |
| `plumbing` | Leaking pipes, taps, sinks, toilets, and drainage problems |
| `vehicle` | Cars, motorcycles, and other vehicle problems |
| `carpentry` | Wooden furniture, doors, cabinets, hinges, and other wooden fixtures |

Classification uses the photo, the written issue, and both answers. It labels the object and the work the user needs, not a background object. An appliance leak can be appliance repair rather than plumbing. One question may resolve a category boundary or a photo/text conflict. There is no extra approval step.

`suggestedService` and `serviceCategory` must each be one of the four values for an accepted image. `other`, `unknown`, `general`, a new trade, a list, or multiple categories are invalid. Express retries or rejects invalid model output. It does not map that output onto a different trade. A missing or unreadable image is an intake error or a retake, not a fifth category. A nearest-category label is not a diagnosis and not proof a provider can do the job.

Express selects `PROVIDERS_BY_SERVICE[serviceCategory]`. Plumbing records are never used for another category.

## Provider Data

Providers are hardcoded demo records in the planned file `backend/src/data/providers.js`. There is no ZIP-code search and no web search. Matching happens on the backend from the validated category. The mobile client cannot supply phone numbers or recipient emails.

Provider names and price ranges stay hidden until final results. Phone numbers live only in `DEMO_PHONES`. Email addresses live only in the server directory. Calls go only to teammate demo numbers. Real businesses are never called.

Listing ranges are demo context for a stated example job. They are not accepted quotes. A negotiation target may start near that provider’s lower listed bound for comparable work, and it stays inside an optional user budget. The target is not displayed as the provider’s final price. An inspection-only or hourly listing is not used as the anchor for a full repair.

The plumbing rows below are demo data, not live businesses. The other three categories start as empty lists, so their match count is zero until demo rows are added.

| ID | Name | Location | Example range (USD) | Phone slot |
| --- | --- | --- | --- | --- |
| `bluewave` | Bluewave Plumbing | College Park, MD | 150–300 | 0 |
| `shellback` | Shellback Repairs | Greenbelt, MD | 175–350 | 1 |
| `tidepool` | Tidepool Plumbing | Hyattsville, MD | 125–275 | 2 |
| `kelp` | Kelp Home Services | Riverdale Park, MD | 100–250 | 3 |

Selecting one provider emails that row’s single configured demo address.

## Accessibility

The primary audience is people who cannot speak or cannot use spoken phone conversations. Every core step is text, images, and taps.

- The required image can come from the camera or the photo library. Camera permission is requested only when taking a photo. Without an image, the flow cannot continue.
- No microphone permission, voice recording, spoken confirmation, or user phone conversation is required.
- The user describes the issue, answers questions, sees the matching count, starts calls, waits, compares results, and requests a booking.
- Controls have clear labels and accessible names. Text scales. Contrast stays readable.
- Loading, success, failure, and recommendation states use readable text. They are not communicated by sound or color alone. The loading message is explicit, for example “Calling providers and comparing offers.”
- Sam identifies itself as an AI assistant acting for the user and shares only the service issue and relevant requirements.
- Sam does not disclose or infer the user’s disability.
- Accessibility is required on each step. It is not a separate onboarding or verification screen.

## Repository Structure

Planned layout. These files are not in the repository yet. The repository currently contains this README and `LICENSE`.

```text
mobile/app/index.jsx                      required photo and written issue
mobile/app/questions.jsx                  two image-grounded questions
mobile/app/call.jsx                       summary, match count, and Call N providers
mobile/app/loading.jsx                    loading until the comparison is ready
mobile/app/results.jsx                    final offers and recommendation only
mobile/app/booking.jsx                    select time and details, send the email
mobile/lib/api.js                         HTTP requests and status polling
mobile/lib/session.js                     remember the non-secret active session ID
mobile/.env.example                       public backend base URL only
backend/src/server.js                     Express HTTP server
backend/src/routes/intake.js
backend/src/routes/questions.js
backend/src/routes/answers.js
backend/src/routes/providers.js           count only; matched IDs stay server-side
backend/src/routes/calls.js               start the call batch
backend/src/routes/sessions.js            readiness and final results
backend/src/routes/elevenlabs-webhook.js  signed completed-call callback
backend/src/routes/bookings.js
backend/src/routes/resend-webhook.js
backend/src/data/providers.js             categories, listing ranges, and demo emails
backend/src/lib/file-store.js             serialized atomic JSON and text writes
backend/src/lib/elevenlabs.js             start calls and retrieve completed conversations
backend/src/lib/gemini.js                 questions, brief, and offer analysis
backend/src/lib/transcripts.js            normalize provider payloads into JSON and text
backend/src/lib/compare.js                comparable job-cost calculations
backend/src/lib/email.js                  Resend adapter and fixed template
backend/src/lib/mock.js                   backend-only sample transcripts
backend/src/worker.js                     local-file-backed pending work
backend/data/sessions/                    runtime files, ignored by Git
backend/.env.example                      provider credentials and DATA_DIR
```

Run one backend host and one owning worker. Gitignore `backend/data/`. API keys stay on the backend.

## API Overview

No route requires login or an `Authorization` header. The client never sends provider phone numbers, recipient emails, or transcript text. Destinations, quotes, and slots are loaded from server files. These routes are the planned contract. They are not implemented yet.

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/intake` | Validate the required image and written issue. Store findings and exactly two questions. Return `201` and a `sessionId`. Never start a call. |
| `POST` | `/api/questions` | Return the two saved questions. Do not regenerate them from text after the image is discarded. |
| `POST` | `/api/answers` | Validate both answers against saved options. Store a versioned brief, one category, and `readyToCall`. |
| `GET` | `/api/providers` | Query `sessionId`. Return `providerCount` and a message only. |
| `POST` | `/api/call` | Require image analysis, both answers, `readyToCall: true`, and saved match IDs. Return `202` and `status: processing`. |
| `GET` | `/api/sessions/:sessionId/status` | Return `processing`, `ready`, `failed`, or `needs_attention`. No transcript content. |
| `GET` | `/api/sessions/:sessionId/results` | Return `202` while processing, then the comparison only. |
| `POST` | `/api/elevenlabs-webhook` | Verify the signature on the raw body. Store the completed transcript. Fail the write with a retryable error rather than acknowledging lost text. |
| `POST` | `/api/bookings` | Queue one email after **Send booking request**. Return `202`, `bookingId`, `requestStatus: queued`, and `appointmentStatus: awaiting_provider`. |
| `GET` | `/api/bookings/:bookingId` | Query `sessionId`. Return stored email state. Appointment status stays `awaiting_provider`. |
| `POST` | `/api/resend-webhook` | Verify the signature on the raw body. Update delivery state only, not appointment confirmation. |

**Intake validation.** `issueDescription` is 1–2,000 characters of non-whitespace text. `image` is one non-empty JPEG or PNG. `budget` is optional, finite, and nonnegative, in dollars. `service` is only a hint. Missing image: `422 IMAGE_REQUIRED`. Undecodable image: `422 INVALID_IMAGE`. Unreadable image: `422 IMAGE_UNCLEAR`. Unsupported format: `415`. Oversized body: `413`. Gemini timeout after eight seconds, or Gemini unavailable: `503 IMAGE_ANALYSIS_UNAVAILABLE`, with retry of the same image. Do not return generic questions. Reject bad intake before calling Gemini.

The client corrects orientation and re-encodes to a long edge of about 1024 pixels. The server enforces 2 MiB of decoded image data, 3 MiB of total JSON including base64, and a 4-megapixel decoded limit. Check bytes and dimensions. A device-local URI is not an upload. A client request ID makes a completed retry return the same session and questions. Store findings, then discard and do not log raw image bytes.

**Questions.** Each question has an id, text, two or three options, observation references, and a short purpose. The UI may show a plain “Why we ask” line. If the image cannot support observations, return a retake and an empty question list. Different images must produce relevant questions. A fact already clear from the image or text is not asked again.

**Answers.** Both answers must match saved options. Unusable input returns `readyToCall: false` with a retry or edit path. No external call runs in this route.

**Calls.** Ignore arbitrary recipients from the client. Resolve destinations from `DEMO_PHONES`. Keep conversation IDs internal until final results. Preserve the difference between image observations, user reports, and unknowns. Sam may say the user reports a continuous leak at a connection. Sam may not say Gemini diagnosed the joint, that the rep can see the image, or anything about a disability.

**Status and results.** Finish when every matched call is terminal and its analysis has succeeded or failed after bounded retries. Use deadlines so loading cannot continue forever. Partial results list exclusions. Results include provider names, amounts, price basis, included work, fees, slots, a recommendation explanation, and exclusions. They omit transcripts, excerpts, recording URLs, file paths, and Gemini evidence.

**Bookings.** The client identifies the stored offer, slot, user-entered service details, and a client request ID. Express loads the recipient, quote, and slot from saved analysis. The slot must belong to that session, provider, and analysis version, be in the future, and have a resolved date and time zone. Identical retries reuse the booking. An ambiguous send does not create a second email. Email states are `queued`, `submitted`, `delivered`, `failed`, and `delivery_unknown`. Submitted means Resend accepted the message. Delivered means a delivery event. Neither means the provider accepted the appointment.

**Planned live-call endpoints.**

- Start: `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call`
- Recover a finished conversation: `GET https://api.elevenlabs.io/v1/convai/conversations/{id}`

Map `initiated` → `ringing`, `in-progress` → `live`, `processing` → `wrapping-up`, `done` → `done`, and `failed` → `failed`. Keep an unknown raw status and surface an integration error.

Mount raw-body signature checks for both webhooks before the JSON parser.

## Voice Agent

Sam is the planned ElevenLabs agent for each separate provider call. Live voice is not implemented in this repository. Express Gemini and the ElevenLabs Gemini model are separate. The live loop does not read local transcript files, does not wait on the mobile poll, and does not take extra negotiation instructions from the comparison step.

- Sam introduces itself as an AI assistant calling for the user, then asks whether it has reached the provider. If local time is unknown, the greeting is “Hello.”
- Sam confirms the provider or person and waits for an answer. If the party is wrong, Sam apologizes, asks for the right person only when that is appropriate, and ends if nobody suitable is available.
- Sam explains only the user-reported issue and relevant observations, in plain language, and separates those from unknown causes.
- Sam confirms the provider can help before discussing pricing. If they cannot help, Sam thanks them and ends. That outcome is not an offer.
- Sam collects scope, availability, fees, and price basis one question at a time, and asks for the price before negotiating. Price basis is fixed job, estimate, hourly, or inspection only.
- Sam negotiates at most twice, only after a real quote, and only for the same scope or a waived call-out fee. The cap is a prompt instruction until a stricter workflow enforces it.
- Sam does not invent competing offers, referrals, or a discount. A refusal still leaves the actual offer in the comparison.
- Sam does not claim the image proves a diagnosis, the source of damage, or the leak rate.
- Sam collects appointment dates, arrival windows, and time zones. “Tomorrow” or “Tuesday” is resolved by asking, not by guessing. Missing date or time zone blocks the booking email.
- Sam does not ask for email addresses. The directory already has the demo recipient. Sam does not ask for a ZIP code.
- Sam does not book or reserve an appointment during the quote call, and does not take payment, accept a contract, or give repair instructions. Sam reads back the final price, basis, included work, fees, and times, then says the customer will review the options.

Call context includes the customer name, provider name, category, that provider’s listing range and basis, a server-prepared negotiation target, the written issue, image observations, both answers, the optional budget, and verified prior history when it exists. History is used only when it is real. The negotiation target is context, not a quote the provider already made.

Planned call setup uses `end_call`, voicemail detection, and keypad tones, with a duration of about two minutes. The agent ID and phone number ID belong in backend environment variables.

**Comparison rules.** The worker analyzes a reconciled final transcript only. Extraction records outcome (`quoted`, `no_quote`, `voicemail`, `no_answer`), scope, price basis (`fixed_job`, `estimate`, `hourly`, `inspection_only`, `no_quote`), initial and final amounts, currency, inclusions, fees, availability, conditions, and evidence turns. Unknowns stay null, not zero. Only an explicitly waived fee is zero. Availability stores exact dates or windows, time zone, and the original wording.

Backend code computes money in integer cents:

- Compare fixed quotes only for matching work. Add a mandatory extra fee once.
- Label estimates “Estimate, subject to inspection,” and compare them apart from fixed totals.
- Show hourly rates with minimum hours. Leave the job total unknown when hours, parts, or fees are unconfirmed.
- Show an inspection-only price as the price of an inspection.
- Negotiated reduction is the initial amount minus the final amount from the same provider when scope, basis, and included charges are unchanged.
- Unknown tax or fees produce an incomplete total.
- Recommend a provider only when comparable terms exist. Otherwise show tradeoffs.
- Do not invent monthly or annual savings.

If Gemini times out, keep the transcripts, retry with backoff, and show “Comparison unavailable” after bounded retries. Do not substitute a generated offer. A corrected transcript invalidates the previous extraction and comparison.

The booking email is a fixed template, not model-written mail. It includes the customer name, written problem, service, requested date, arrival window, time zone, discussed amount and price basis, known fees and conditions, user-entered service address and contact details, and a request ID. It asks the provider to confirm or suggest another time. It states that the email requests the appointment and does not assume the slot is reserved. It omits raw images and transcripts. The user’s contact email may be Reply-To. It is not the From address. `RESEND_FROM_EMAIL` must be on a verified domain. The default Resend test sender is limited to that account’s own address, so it cannot be assumed to reach every demo inbox. A missing sender or demo recipient is a setup error, not a successful send.

## Simulated Call Mode

Simulated mode and live mode are both planned. Neither is implemented in this repository.

**Simulated mode** uses sample transcripts from the planned `backend/src/lib/mock.js` file. **Call N providers** still requires the button, the saved brief, and the matched directory rows, and it still runs extraction and comparison. It does not start an ElevenLabs outbound call and does not dial teammates. Use it to exercise loading and results without spending ElevenLabs minutes. Set `CALL_MODE=simulated` until a live practice call is intentional.

**Planned live mode** starts `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call` for each matched provider, about one second apart, using numbers in `DEMO_PHONES` only. Completed transcripts arrive through the signed webhook or, if that callback is late, through the conversation retrieval endpoint. Transcript files are written from provider payloads actually received, not from imagined in-progress lines. On restart, the worker resumes unfinished jobs and reuses existing conversation records instead of placing duplicate calls.

## Local Storage

No database is used. Provider configuration is planned in `backend/src/data/providers.js`. Runtime files are JSON and plain text under `DATA_DIR` (`backend/data` or another local writable folder). Provider speech is never written out as executable code.

```text
backend/data/sessions/<sessionId>/
  session.json                 intake findings, questions, answers, brief, match IDs
  state.json                   processing state, per-call state, and jobs
  calls/<callId>/
    provider-response.json     completed provider payload
    transcript.json            roles, messages, turn IDs, timing
    transcript.txt             readable agent and rep lines
    transcript-<hash>.json     prior final version when a transcript is corrected
    analysis.json              Gemini extraction and private evidence
  comparison.json              recommendation and user-facing results
  bookings/<bookingId>.json    recipient, slot snapshot, email payload, send state
```

- Session and call IDs are generated on the server and are never client file paths. Each call has its own folder.
- Runtime data under `backend/data/` is ignored by Git.
- Raw images and credentials are not stored. Image bytes are discarded after findings are saved and are not logged.
- Transcripts, evidence, recording references, and phone numbers never go to the mobile app.
- Writes are atomic: write a complete temp file beside the target, then rename it. Write transcript files before state points at that version.
- One worker serializes read-modify-write on shared session, state, and booking files.
- Duplicate calls for the same session and provider are prevented. Duplicate booking emails for the same client request ID are prevented. Unchanged analysis is reused by input hash.
- Webhook handlers deduplicate events. A failed file write returns a retryable error.
- Delete `backend/data/sessions/` when a demo is finished.

Session IDs group files. They are not authorization. Keep the demo API limited to the hackathon’s own devices and webhooks.

## Setup

Only this repository checkout exists today. `mobile/`, `backend/`, `package.json`, and env example files are not in the tree, so there is no install or run command yet.

```bash
git clone <repository-url>
cd CallAi
```

### Frontend

The Expo / React Native app is planned under `mobile/` and is not present. When it exists, set `EXPO_PUBLIC_API_BASE_URL` to the phone-reachable HTTPS backend URL. Do not point a physical device at the laptop’s `localhost`.

### Backend

The Node.js / Express API and its single worker are planned under `backend/` and are not present. When they exist, the API and the worker run together so call completion, Gemini analysis, and booking sends continue after `POST /api/call` returns. Webhook routes need raw-body signature checks before JSON parsing. JSON limits must match the intake image rules.

Do not commit API keys, webhook secrets, or demo phone numbers.

## Environment Variables

Placeholder names only. No real credentials belong in the repository. These files are planned and do not exist yet.

`mobile/.env.example`:

```bash
EXPO_PUBLIC_API_BASE_URL=<https://your-phone-reachable-backend>
```

`backend/.env.example`:

```bash
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=<your-gemini-model>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
ELEVENLABS_AGENT_ID=<your-elevenlabs-agent-id>
ELEVENLABS_AGENT_PHONE_NUMBER_ID=<your-elevenlabs-phone-number-id>
ELEVENLABS_WEBHOOK_SECRET=<your-elevenlabs-webhook-secret>
DEMO_PHONES=<teammate-demo-numbers>
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM_EMAIL=<your-verified-domain-sender>
RESEND_WEBHOOK_SECRET=<your-resend-webhook-secret>
DATA_DIR=backend/data
CALL_MODE=simulated
```

`DEMO_PHONES` is the only source of dialed numbers. Keep `CALL_MODE=simulated` until a live practice call is intentional.

## Testing Requirements

These checks are required before a judged demo. They are not implemented in this repository, and none of them have been run.

- **Validation.** Reject a missing image, an empty issue, a non-image payload, and an oversized body before any Gemini call. Accept a real JPEG or PNG plus written issue. Return the documented `422`, `415`, `413`, and `503` cases. Confirm image byte, dimension, and long-edge limits.
- **Questions and category.** Confirm exactly two image-grounded questions with two or three options. A different photo produces different questions. A blurry or conflicting photo retakes or clarifies and does not invent observations. An appliance leak is not forced into `plumbing`. The brief uses exactly one of the four category ids. Empty categories return count zero and a disabled call button.
- **Simulated-call tests.** In `CALL_MODE=simulated`, intake, questions, and answers place no call. Only **Call N providers** starts work. Sample transcripts are written under the session call folders. The app receives the comparison without transcript text, excerpts, or file paths. Loading uses status polling. Failed calls appear as exclusions.
- **Transcript extraction tests.** Run extraction only on a finalized transcript. Unknown amounts stay null. Waived fees are the only zeros. Hourly and inspection-only prices are not treated as full repair totals. Evidence turns are retained in local analysis files and are not returned to the app.
- **Comparison tests.** Comparable fixed quotes can be ranked. Estimates stay labeled. Incomplete totals stay incomplete. Negotiated reduction uses the same provider and unchanged scope only. No monthly or annual savings are shown. A Gemini failure preserves transcripts and does not invent an offer.
- **Duplicate-call tests.** A repeated `POST /api/call` does not dial the same session and provider again. Restart reuses existing conversation records.
- **Duplicate-booking tests.** **Send booking request** is the only send trigger. The same client request ID does not send a second email. The slot must be in the future and belong to that analysis version. The UI says the request is awaiting provider confirmation.
- **Webhook signature tests.** ElevenLabs and Resend callbacks verify signatures on the raw body, deduplicate events, and return a retryable error when the file write fails. Resend delivery does not mark the appointment confirmed.
- **Accessibility checks.** Complete the path with text and taps only. Confirm there is no microphone prompt, no voice recording, and no requirement to speak or answer a call. Confirm loading, error, success, and recommendation states are readable as text.
- **Live practice.** Before the judged demo, place at least five difficult live calls to teammate numbers. Cover interruptions, hourly versus fixed prices, inspection-only estimates, unclear fees, a rejected target, and no quote. These calls are not a claim that live mode already works.

## Current Status

This is a planning baseline. The repository contains the README and the MIT license. The Expo app, Express routes, local file store, Gemini prompts, ElevenLabs agent, Twilio connection, and Resend sending are not implemented here and have not been tested against team accounts.

Limitations that remain part of the design:

- No provider web search, no ZIP-code matching, and no calls to real businesses.
- No login, payments, deposits, or booking during the quote call.
- No calendar integration, inbound-email confirmation, cancellation, or rescheduling.
- A booking email requests a time. It does not confirm the appointment.
- Simulated mode is the first end-to-end target once the app and API exist. Live calls, when built, stay limited to `DEMO_PHONES`.

## Future Improvements

Only after the core flow works end to end:

- A second negotiation round that calls the two best providers back and asks each to beat the other’s verified quote.
- Location-based provider discovery.
- More service categories, which requires its own scope change.
- Deployment.
- A provider confirmation workflow. This baseline does not treat email delivery as confirmation.

## License

MIT.
