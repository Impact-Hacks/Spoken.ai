# CallAi

CallAi helps people who cannot use a spoken phone call compare repair offers. A photo and a written description are enough to start. An AI voice agent calls demo providers, and the user reviews the results and sends a booking request.

## Overview

CallAi is an accessibility-focused mobile app. A user submits a repair photo and a written issue, answers a few questions, compares service-provider offers, and requests an appointment without speaking on the phone.

The app is Expo / React Native. A Node.js and Express backend uses Gemini to understand the problem and compare offers. ElevenLabs and Twilio place the provider calls. Resend sends the booking request email. The demo uses configured demo providers, not real businesses.

## Problem

Getting a repair quote usually means calling several providers and explaining the same problem each time. That phone call is an accessibility barrier for people who cannot speak or cannot use spoken phone conversations. They can show what is wrong and write it down. They should still be able to compare price, scope, and availability.

## Solution

1. Submit a problem photo and written description.
2. Answer two image-grounded questions.
3. Find matching demo providers.
4. Let the AI voice agent call providers.
5. Compare offers, prices, and availability.
6. Send a booking request to the selected provider.

## Key Features

- Image and text-based service request
- Image-grounded follow-up questions
- AI-assisted provider conversations
- Price and availability comparison
- Accessibility without speaking or microphone access
- Simulated-call mode for testing
- Booking request email
- Four supported service categories: `electrical_appliances`, `plumbing`, `vehicle`, and `carpentry`
- Demo providers instead of real businesses

## User Flow

```text
Problem photo + written issue
→ follow-up questions
→ provider matching
→ AI calls providers
→ offer comparison
→ provider and time selection
→ booking request
```
