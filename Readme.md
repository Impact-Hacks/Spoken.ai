# Spoken.ai

Spoken.ai helps people who cannot use a spoken phone call compare repair offers. A photo and a written description are enough to start. An AI voice agent calls demo providers, and the user reviews the results and sends a booking request.

## Overview

Spoken.ai is an accessibility-focused mobile app. A user submits a repair photo and a written issue, answers a few questions, compares service-provider offers, and requests an appointment without speaking on the phone.

The app is Expo / React Native (`client/`). A Node.js and Express backend (`backend/`) uses Gemini to understand the problem and extract offers from call transcripts. ElevenLabs and Twilio place the provider calls. The demo uses configured demo providers, not real businesses.

**Status.** Intake, questions, answers, provider matching, live and simulated calls, transcript extraction, the offer comparison, and the booking request email (Resend, with a calendar file) are implemented. The signed webhooks and booking status lookup are still planned.

## Problem

Getting a repair quote usually means calling several providers and explaining the same problem each time. That phone call is an accessibility barrier for people who cannot speak or cannot use spoken phone conversations. They can show what is wrong and write it down. They should still be able to compare price, scope, and availability.

## Solution

1. Submit a problem photo, written description, and budget.
2. Answer two image-grounded questions.
3. Find matching demo providers.
4. Let the AI voice agent call providers.
5. Compare offers, prices, and availability.
6. Email a booking request, with a calendar file, to the selected provider.

## Key Features

- Image and text-based service request
- Image-grounded follow-up questions
- AI-assisted provider conversations through ElevenLabs and Twilio
- Price and availability comparison
- Accessibility without speaking or microphone access
- Simulated-call mode for testing, and a cap on how many providers are called
- Four supported service categories: `electrical_appliances`, `plumbing`, `vehicle`, and `carpentry`
- Demo providers instead of real businesses

## User Flow

```text
Problem photo + written issue + budget
→ contact details
→ two follow-up questions
→ summary and provider count
→ AI calls providers
→ offer comparison
→ provider and time selection
→ booking request email
```

There is no login and no separate category-approval screen. A loading screen with per-call progress sits between the call tap and the comparison.

1. **Describe.** The user takes or selects a required photo, types the issue, and enters a maximum budget in dollars (required, greater than zero). Example: an under-sink pipe photo and “Water is leaking from the pipe under my kitchen sink.” Leaving this screen sends `POST /api/intake` in the background.
2. **Intake.** `POST /api/intake` validates the image, text, and budget. Gemini sees the photo and text in one request and returns observations, one suggested category, and exactly two multiple-choice questions grounded in those observations. Raw image bytes are discarded. Intake never places a call.
3. **Details.** While intake runs, the user enters name, phone, address, ZIP, and an optional unit. These stay on the device until the booking request. Only the first name is sent when calls start, so Sam can say who it is calling for. The full details go to the server, and into the provider email, only when the user taps **Send booking request**. If Gemini finds the photo unclear, the user is sent back to retake it.
4. **Questions.** The user taps one option for each question. `POST /api/answers` checks both answers against the saved options, stores them, sets the call category to Gemini’s suggested category, and returns `providerCount`. Answers cannot change after calls start.
5. **Summary.** “Here’s what I’ll ask” shows the service, a plain summary of the user’s report and answers (built in the app, not a diagnosis), and “I found N providers who may help.” The button reads **Call N providers**. N is the number of providers that will actually be called (see `CALL_LIMIT`). Zero disables the button.
6. **Calls.** **Call N providers** is the only call trigger. `POST /api/call` starts the run in the background and returns `202 processing`. Destinations come only from `DEMO_PHONES`. Repeated starts for the same session do not dial again.
7. **Loading.** The app shows “Calling providers and comparing offers” with a row per call (Waiting, Dialing, Ringing, On the call, Wrapping up, Finished, Didn’t connect). It polls `GET /api/sessions/:sessionId/status` every three seconds, backing off up to 15 seconds on errors. If the calls cannot start, the screen shows the reason with **Try again**.
8. **Results.** When every call is finished and analyzed, the app loads `GET /api/sessions/:sessionId/results`. Each provider shows a price, price basis, details, and offered times. Calls without a usable quote appear as exclusions (“Would not quote over the phone”, “No answer”, “Call did not connect”). “Best comparable offer” is shown only when a fixed complete-job price with a time exists.
9. **Booking.** The user selects one offered time, enters a contact email, and taps **Send booking request**. `POST /api/bookings` emails the request to the provider (see [Booking Request Email](#booking-request-email)). On success the app shows “Booking request sent” and clears the photo, issue, and details. A sent request is not a confirmed appointment; the provider replies to the user’s email to confirm. If the send fails, the screen shows the reason and the user can try again without sending a second email.

## Supported Service Categories

Gemini must return exactly one of these values. The same strings are prompt output, JSON validation, and directory keys.

| Category id | What it covers |
| --- | --- |
| `electrical_appliances` | Washing machines, refrigerators, ovens, fans, and other electrical household appliances |
| `plumbing` | Leaking pipes, taps, sinks, toilets, and drainage problems |
| `vehicle` | Cars, motorcycles, and other vehicle problems |
| `carpentry` | Wooden furniture, doors, cabinets, hinges, and other wooden fixtures |

Gemini classifies from the photo and written issue at intake. It labels the object and the work the user needs, not a background object; an appliance leak is `electrical_appliances`, not plumbing. The answers step keeps that category; it does not reclassify.

Invalid model output (a category outside the four, or anything other than exactly two questions with two or three distinct options) is retried once, then intake returns `503 IMAGE_ANALYSIS_UNAVAILABLE`. A missing or unreadable image is an intake error or a retake, not a fifth category. A category label is not a diagnosis and not proof a provider can do the job.

Express selects providers from `PROVIDERS_BY_SERVICE[serviceCategory]`. Records from one category are never used for another.

## Provider Data

Providers are hardcoded demo records in `backend/src/data/providers.js`. There is no ZIP-code search and no web search. Matching happens on the backend from the category. The mobile client cannot supply phone numbers.

Provider names and price ranges stay hidden until final results. Phone numbers live only in `DEMO_PHONES`. Calls go only to demo numbers. Real businesses are never called.

Each row’s `phoneSlot` indexes `DEMO_PHONES`, wrapping around. With one demo number, every provider rings that one phone.

Listing ranges are demo context for a stated example job. They are not accepted quotes. The negotiation target sent to Sam is the provider’s lower listed bound, or the user’s budget if that is lower. The target is never shown as the provider’s price.

`CALL_LIMIT` calls only the first N providers in the category’s list. Leave it empty to call all of them.

| Category | ID | Name | Location | Example range (USD) | Phone slot |
| --- | --- | --- | --- | --- | --- |
| plumbing | `bluewave` | Bluewave Plumbing | College Park, MD | 150–300 | 0 |
| plumbing | `shellback` | Shellback Repairs | Greenbelt, MD | 175–350 | 1 |
| plumbing | `tidepool` | Tidepool Plumbing | Hyattsville, MD | 125–275 | 2 |
| plumbing | `kelp` | Kelp Home Services | Riverdale Park, MD | 100–250 | 3 |
| electrical_appliances | `voltline` | Voltline Appliance Repair | College Park, MD | 120–280 | 0 |
| electrical_appliances | `brightfix` | Brightfix Appliances | Greenbelt, MD | 100–250 | 1 |
| electrical_appliances | `coilworks` | Coilworks Home Electric | Hyattsville, MD | 140–320 | 2 |
| vehicle | `roadrunner` | Roadrunner Auto Care | College Park, MD | 150–400 | 0 |
| vehicle | `gearhouse` | Gearhouse Garage | Greenbelt, MD | 120–350 | 1 |
| vehicle | `pitstop` | Pitstop Mobile Mechanics | Riverdale Park, MD | 100–300 | 2 |
| carpentry | `oakline` | Oakline Carpentry | College Park, MD | 90–250 | 0 |
| carpentry | `grainworks` | Grainworks Woodshop | Hyattsville, MD | 110–300 | 1 |
| carpentry | `dovetail` | Dovetail Fixers | Greenbelt, MD | 80–220 | 2 |

Provider rows have no email addresses. Every booking request goes to the one teammate address in `PROVIDER_EMAIL`, which stands in for all providers.

## Accessibility

The primary audience is people who cannot speak or cannot use spoken phone conversations. Every core step is text, images, and taps.

- The required image can come from the camera or the photo library. Camera permission is requested only when taking a photo. Without an image, the flow cannot continue.
- No microphone permission, voice recording, spoken confirmation, or user phone conversation is required.
- The user describes the issue, answers questions, sees the matching count, starts calls, waits, compares results, and requests a booking.
- Controls have clear labels and accessible names. Text scales. Contrast stays readable.
- Loading, success, failure, and recommendation states use readable text. They are not communicated by sound or color alone. The loading message is explicit: “Calling providers and comparing offers,” with a text status for each call.
- Sam identifies itself as an AI assistant acting for the user and shares only the service issue and relevant requirements.
- Sam does not disclose or infer the user’s disability.
- Accessibility is required on each step. It is not a separate onboarding or verification screen.

## Repository Structure

```text
client/App.js                             screen state machine, intake, answers, call start and polling
client/src/screens/OnboardingScreen.js    intro
client/src/screens/DescribeScreen.js      required photo, written issue, budget
client/src/screens/DetailsScreen.js       name, phone, address, ZIP (sent only with the booking request)
client/src/screens/QuestionsScreen.js     two image-grounded questions
client/src/screens/SummaryScreen.js       summary, provider count, Call N providers
client/src/screens/LoadingScreen.js       per-call progress until the comparison is ready
client/src/screens/ResultsScreen.js       offers and recommendation
client/src/screens/BookingScreen.js       pick a time, contact email, send the request
client/src/screens/SentScreen.js          booking request confirmation
client/src/lib/api.js                     HTTP requests; backend URL from Metro's host
client/src/data/mock.js                   category labels and the local summary text
backend/src/server.js                     Express HTTP server; resumes unfinished call runs on boot
backend/src/worker.js                     in-process call runner: dial, poll, transcript, extract, compare
backend/src/routes/intake.js              photo + issue + budget → two questions
backend/src/routes/answers.js             validate answers, set category, return provider count
backend/src/routes/providers.js           count only; matched IDs stay server-side
backend/src/routes/calls.js               start the call run
backend/src/routes/sessions.js            call status and final results
backend/src/routes/bookings.js            validate and email one booking request
backend/src/data/providers.js             categories, listing ranges, phone slots, CALL_LIMIT
backend/src/lib/file-store.js             serialized atomic JSON and text writes
backend/src/lib/elevenlabs.js             start outbound calls and fetch conversations
backend/src/lib/gemini.js                 intake questions and offer extraction
backend/src/lib/transcripts.js            normalize conversation payloads into JSON and text
backend/src/lib/compare.js                cents-based offer comparison
backend/src/lib/email.js                  Resend client and the fixed booking-request template
backend/src/lib/calendar.js               .ics file attached to the booking email
backend/src/lib/mock.js                   sample conversations for simulated mode
backend/data/sessions/                    runtime files, ignored by Git
backend/.env.example                      provider credentials and settings
```

Stubs for planned work: `backend/src/routes/questions.js`, `elevenlabs-webhook.js`, and `resend-webhook.js`.

## API Overview

No route requires login or an `Authorization` header. The client never sends provider phone numbers, provider emails, or transcript text. Destinations and quotes come from server files.

| Method | Path | Status | Behavior |
| --- | --- | --- | --- |
| `POST` | `/api/intake` | Implemented | Validate image, issue, and budget. Store observations, category, and exactly two questions. Return `201` with `sessionId`, `suggestedService`, and `questions`. Never start a call. |
| `POST` | `/api/answers` | Implemented | Body `{ sessionId, answers }`. Validate both answers against saved options. Return `readyToCall`, `serviceCategory`, and `providerCount`. `409 CALLS_STARTED` once calls exist. |
| `GET` | `/api/providers` | Implemented | Query `sessionId`. Return `providerCount` and a message only. |
| `POST` | `/api/call` | Implemented | Body `{ sessionId, customerName }`. Require saved answers and at least one provider. Return `202` with `status: processing` and `providerCount`. A repeat returns the existing run. `503 CALLS_NOT_CONFIGURED` in live mode when ElevenLabs settings or `DEMO_PHONES` are missing. |
| `GET` | `/api/sessions/:sessionId/status` | Implemented | Return `processing`, `ready`, or `failed`, plus `calls: [{ n, status }]`. No names, numbers, or transcript content. |
| `GET` | `/api/sessions/:sessionId/results` | Implemented | `202` while processing, then `{ status, offers, recommendedId }`. |
| `POST` | `/api/questions` | Planned | Return the two saved questions. |
| `POST` | `/api/elevenlabs-webhook` | Planned | Signed post-call transcript. Not needed today; the worker polls ElevenLabs instead. |
| `POST` | `/api/bookings` | Implemented | Body `{ sessionId, providerId, slot, customer, clientRequestId }`. Email one booking request to `PROVIDER_EMAIL`. Return `202` with `bookingId`, `requestStatus: submitted`, and `appointmentStatus: awaiting_provider`. Errors: `422 PROVIDER_INVALID`, `EMAIL_INVALID`, `SLOT_INVALID`; `404 OFFER_NOT_FOUND`; `502 EMAIL_FAILED`; `503 EMAIL_NOT_CONFIGURED`. |
| `GET` | `/api/bookings/:bookingId` | Planned | Return stored email state. |
| `POST` | `/api/resend-webhook` | Planned | Update email delivery state. |

**Intake validation.** `issueDescription` is 1–2,000 characters. `budget` is required, finite, and greater than zero, in dollars. `image` is one non-empty JPEG or PNG. Empty issue: `422 ISSUE_REQUIRED`. Missing budget: `422 BUDGET_REQUIRED`. Missing image: `422 IMAGE_REQUIRED`. Undecodable image: `422 INVALID_IMAGE`. Unclear image: `422 IMAGE_UNCLEAR` with Gemini’s retake advice. Unsupported format: `415`. Over 2 MiB of image or 3 MiB of JSON: `413`. Gemini timeout after eight seconds, or invalid output twice: `503 IMAGE_ANALYSIS_UNAVAILABLE`. Bad input is rejected before Gemini is called.

The client re-encodes the photo to a JPEG with a long edge of about 1024 pixels, which also fixes orientation. A client request ID makes a retried intake return the same session and questions. Raw image bytes are never stored or logged.

**Questions.** Each question has an id, text, two or three options, observation references, and a short purpose. The app shows the purpose as a “Why we ask” line.

**Call status.** Each call moves through `queued` → `dialing` → `ringing` → `live` → `wrapping-up` → `done`, or ends `failed`. ElevenLabs statuses map `initiated` → `ringing`, `in-progress` → `live`, `processing` → `wrapping-up`, `done` → `done`, `failed` → `failed`. A run is `ready` when at least one call finished, otherwise `failed`. Each call has a 12-minute deadline so loading cannot continue forever.

**Results.** Offers include provider name, price, long price, details, offered times (display labels plus `slotTimes` with date, window, and time zone), and the `best` flag. They omit transcripts, conversation IDs, phone numbers, and file paths.

## Voice Agent

Sam is the ElevenLabs agent used for each provider call. Its prompt and first message live in ElevenLabs, not this repository. ElevenLabs runs Sam on its own Gemini model; that is separate from the backend’s Gemini calls.

The backend fills these dynamic variables for each call:

| Variable | Source |
| --- | --- |
| `customer_name` | User’s first name from the details screen, or “a customer” |
| `provider_name` | Provider row |
| `service` | Category label |
| `issue_description` | User’s written issue |
| `image_observations` | Gemini’s photo observations, one per line |
| `needs` | Each question and the user’s answer |
| `budget` | User’s budget in USD |
| `listed_min`, `listed_max`, `listing_basis` | Provider’s demo listing |
| `negotiation_target` | Lower of `listed_min` and the budget |
| `max_negotiation_attempts` | `2` |
| `verified_history` | `none` |

Sam’s prompt covers the following:

- Sam introduces itself as an AI assistant calling for the user and asks whether it has reached the provider.
- If the business is wrong, Sam apologizes and ends. If the person is wrong, Sam asks for someone who handles service enquiries.
- Sam explains only the user-reported issue and relevant observations, in plain language, and does not invent a cause or diagnosis.
- Sam confirms the provider can help before discussing pricing.
- Sam asks for the price and its basis (fixed job, estimate, hourly, or inspection only), included work, and extra charges, one question at a time.
- Sam negotiates at most twice, only after a real quote, toward the target for the same work. Sam never invents competing offers or discounts.
- Sam collects appointment dates, arrival windows, and time zones, and asks rather than guesses when “tomorrow” or a weekday is said.
- Sam does not ask for email addresses or a ZIP code, does not book, pay, or accept contracts, and does not give repair instructions.
- Sam reads back the final terms, asks for confirmation, closes, and uses `end_call`. Voicemail detection and keypad tones are enabled.

The agent’s maximum call length is set in ElevenLabs (currently 600 seconds). About 180 seconds suits the two-minute script.

**Offer extraction.** After each finished call, the worker saves the transcript and asks Gemini to extract, from the provider’s actual words only: outcome (`quoted`, `no_quote`, `cannot_help`, `voicemail`, `no_answer`), price basis (`fixed_job`, `estimate`, `hourly`, `inspection_only`, `no_quote`), initial and final amounts, minimum hours, included work, extra fees, and offered slots resolved to calendar dates. Unknown amounts stay null. A call where the provider never spoke is recorded as `no_answer` without Gemini. If extraction fails twice, that provider shows “Comparison unavailable for this call”; no offer is invented.

**Comparison rules.** `backend/src/lib/compare.js` computes money in integer cents:

- A fixed complete-job price shows as “$200 fixed,” with “Negotiated down from $250” when the final price is lower than the first.
- Estimates are labeled “Estimate, subject to inspection.”
- Hourly rates show the minimum hours and “Total unknown.”
- An inspection-only price shows as the price of an inspection, with “Repair priced after inspection.”
- Only future slots are shown.
- “Best comparable offer” goes to the cheapest fixed complete-job price that has at least one slot. Otherwise no recommendation is made.

## Booking Request Email

**Send booking request** calls `POST /api/bookings`, which sends one email through Resend. The email is a fixed template; no model writes it.

- **Recipient.** `PROVIDER_EMAIL`, the teammate address that stands in for every demo provider. Reply-To is the user’s email, so the provider answers the user directly.
- **Content.** Requested time, quoted price and terms, the problem, the user’s name, phone, service address, and email, and a request ID. It states that this is a request, not a confirmed booking.
- **Trusted values.** With a `sessionId`, the price, terms, and issue come from the session’s `comparison.json` and `session.json`, and the slot must be one the provider offered. The client’s copies are ignored. Without a session (booking-screen testing only), the client’s offer summary is used as sent.
- **Calendar file.** The email attaches `appointment.ics`, a tentative “add to calendar” event (not a meeting invite with Accept/Decline). A window such as “9–11 AM ET” becomes a timed event in that time zone (US zones such as ET, CT, MT, and PT). A window with no recognized time zone becomes a timed event in the reader’s local time. A window that can’t be parsed, such as “morning”, becomes an all-day event with the window in the title, so no time is invented. If the slot has no usable date, the email is sent without the file.
- **No duplicate emails.** The app sends a `clientRequestId` and reuses it when the same request is retried, so a retry after a timeout returns the first result instead of emailing again. It also becomes the Resend idempotency key, and the server reuses the same booking ID and timestamp for it so the retried email is identical. Changing the provider, time, or email starts a new request.
- **Storage.** With a session, the result is saved as `bookings/<bookingId>.json` (status, provider, slot, price, time). The email itself is not stored.

**Resend sender.** `RESEND_FROM_EMAIL` defaults to Resend’s shared test sender, `Spoken.ai <onboarding@resend.dev>`. That sender only delivers to the Resend account owner’s address, so with it `PROVIDER_EMAIL` must be that address. To email anyone else, verify a domain in Resend and set `RESEND_FROM_EMAIL` to an address on it.

## Twilio Call Flow

Twilio only carries the phone line. ElevenLabs owns the conversation: it runs Sam, transcribes the provider, and speaks Sam’s replies. Express never talks to Twilio directly. The backend has no Twilio env vars.

**One-time setup (calling owner):**

1. Create a Twilio account. Buy a **local-area-code** number, not toll-free; carriers often block toll-free outbound calls to cell phones.
2. On a trial account, verify every demo phone as a Twilio caller ID. A trial account cannot call unverified numbers.
3. In the ElevenLabs **Phone Numbers** tab, import the Twilio number and assign it to the Sam agent.
4. Copy the ElevenLabs **phone number ID** (it starts with `phnum_`) into `ELEVENLABS_AGENT_PHONE_NUMBER_ID`. Use the ID, not the phone number, or ElevenLabs returns “not found.” Copy the agent ID into `ELEVENLABS_AGENT_ID`.
5. Put demo numbers in `DEMO_PHONES` as comma-separated E.164 values, such as `+12405550123`. US numbers need the `+1`. Keep them in `backend/.env`, never in the repository or the mobile app.
6. Set `CALL_MODE=live` and restart the backend.

**Per run, after the user taps Call N providers:**

```mermaid
sequenceDiagram
  participant App as Mobile app
  participant API as Express
  participant EL as ElevenLabs (Sam)
  participant TW as Twilio
  participant Rep as Demo phone
  App->>API: POST /api/call
  API-->>App: 202 processing
  loop each provider; calls to the same number wait for the previous one
    API->>EL: POST /v1/convai/twilio/outbound-call
    EL->>TW: dial DEMO_PHONES[phoneSlot]
    TW->>Rep: ring
    Rep->>TW: answer, press a key (trial message)
    TW->>EL: call audio (both directions)
    EL->>Rep: Sam: intro, issue, quote, up to 2 negotiation attempts, slots
    loop every 4 seconds until done or failed
      API->>EL: GET /v1/convai/conversations/{id}
    end
    API->>API: save transcript.json / .txt, Gemini extraction → analysis.json
  end
  API->>API: comparison.json
  App->>API: GET /api/sessions/:id/status (every 3 s), then /results
```

1. Express resolves each destination as `DEMO_PHONES[phoneSlot % count]`. The client never supplies a number.
2. Calls are grouped by destination number. Calls to the same number run one after another, five seconds apart, because one phone can take only one call. Different numbers are dialed in parallel about one second apart. With one demo number and four providers, a run takes about four call lengths.
3. For each call, Express sends `agent_id`, `agent_phone_number_id`, `to_number`, and the dynamic variables in `conversation_initiation_client_data`. It saves the returned conversation ID and call SID in `state.json`.
4. On a Twilio trial account, Twilio plays a notice and the answerer presses a key to connect.
5. The worker polls the conversation every four seconds until it is `done` or `failed`, then saves the transcript and runs the extraction.
6. When every call is finished, the worker writes `comparison.json` and marks the run `ready`.
7. If the backend restarts mid-run, it resumes on boot. Calls with a conversation ID are polled, not redialed. A call that was mid-dial is marked failed rather than risk a duplicate call.

**Twilio gotchas:**

- Trial accounts play a notice and require a keypress. Rehearse it so the demo does not stall.
- Unverified numbers fail on trial.
- Every live call spends Twilio credit and ElevenLabs minutes. Use `CALL_LIMIT=1` while testing, and keep `CALL_MODE=simulated` until a live call is intentional.
- If a call fails to start, the backend log shows `[calls] … could not start call: <ElevenLabs error>`.
- The app only dials `DEMO_PHONES`. It never calls real businesses.

## Simulated Call Mode

`CALL_MODE=simulated` (the default) dials nobody. Each call steps through ringing, live, and wrapping-up over a few seconds, then uses a sample conversation from `backend/src/lib/mock.js`. The four samples cycle: a fixed price negotiated from $250 to $200, an hourly rate with a two-hour minimum, an inspection-only price, and a refusal to quote. Extraction still runs on real Gemini, and the comparison is built the same way as in live mode.

`CALL_MODE=live` places real calls through ElevenLabs as described above.

## Local Storage

No database is used. Runtime files are JSON and plain text under `DATA_DIR`, relative to the repository root (default `backend/data`).

```text
backend/data/sessions/<sessionId>/
  session.json                 issue, budget, observations, questions, answers, category, first name
  state.json                   run status, mode, and per-call state (status, conversation ID, call SID)
  calls/<providerId>/
    transcript.json            roles, messages, timing, duration, end reason
    transcript.txt             readable Sam and provider lines
    analysis.json              Gemini offer extraction
  comparison.json              offers and recommendation shown to the user
  bookings/<bookingId>.json    booking request result (no email body)
```

- Session IDs are generated on the server. File paths are always built by server code, never from client input.
- Runtime data under `backend/data/` is ignored by Git.
- Raw images and credentials are not stored.
- Transcripts, analyses, and phone numbers never go to the mobile app.
- Apart from the first name in `session.json`, the user’s name, phone, address, and email are not stored on the server. They pass through once, into the booking email.
- Writes are atomic: write a temp file beside the target, then rename it. Writes to one file are serialized.
- A session is called at most once; a repeated start returns the existing run.
- Delete `backend/data/sessions/` when a demo is finished.

Session IDs group files. They are not authorization. Keep the demo API on the team’s own network.

## Setup

Requires Node.js 20.6 or later.

```bash
git clone <repository-url>
cd CallAi
```

### Backend

```bash
cd backend
npm install
cp .env.example .env     # fill in the keys
npm run dev              # restarts on code and .env changes
```

The API listens on `http://0.0.0.0:4310` (or `PORT`) and logs the call mode at startup. Intake needs only `GEMINI_API_KEY`. Live calls also need the ElevenLabs settings and `DEMO_PHONES`. Booking emails need `RESEND_API_KEY` and `PROVIDER_EMAIL`.

Do not commit API keys or demo phone numbers.

### App (Expo Go on a phone)

```bash
cd client
npm install
npx expo start
```

Install Expo Go (SDK 57), put the phone on the same Wi-Fi as the laptop, and scan the QR code. On iOS, allow Local Network access. The app reaches the backend at the laptop’s IP on port 4310 automatically. If that fails, for example on a network that isolates devices, set `EXPO_PUBLIC_API_URL=http://<laptop-ip>:4310` in `client/.env` and restart with `npx expo start -c`.

## Environment Variables

Placeholder values only. No real credentials belong in the repository.

`client/.env` (optional):

```bash
EXPO_PUBLIC_API_URL=<http://your-laptop-ip:4310>
```

`backend/.env`:

```bash
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.5-flash-lite
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
ELEVENLABS_AGENT_ID=<your-elevenlabs-agent-id>
ELEVENLABS_AGENT_PHONE_NUMBER_ID=<phnum_...>
ELEVENLABS_WEBHOOK_SECRET=            # planned webhook, unused today
DEMO_PHONES=<+1XXXXXXXXXX,+1XXXXXXXXXX>
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM_EMAIL=                    # optional; defaults to Spoken.ai <onboarding@resend.dev>
RESEND_WEBHOOK_SECRET=                # planned webhook, unused today
PROVIDER_EMAIL=<teammate@example.com> # receives every booking request
DATA_DIR=backend/data
CALL_MODE=simulated                   # or live
CALL_LIMIT=                           # call only the first N providers; empty calls all
PORT=4310
```
