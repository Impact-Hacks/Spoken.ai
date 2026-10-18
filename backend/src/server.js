import express from 'express';
import intake from './routes/intake.js';
import answers from './routes/answers.js';
import providers from './routes/providers.js';
import calls from './routes/calls.js';
import sessions from './routes/sessions.js';
import { callMode, resumeUnfinished } from './worker.js';

const app = express();
const port = Number(process.env.PORT) || 4310;

// 2 MiB of image is ~2.7 MiB of base64; 3 MiB covers that plus the text fields.
app.use(express.json({ limit: '3mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/intake', intake);
app.use('/api/answers', answers);
app.use('/api/providers', providers);
app.use('/api/call', calls);
app.use('/api/sessions', sessions);

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'BODY_TOO_LARGE', message: 'That photo is too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
});

// Bind to all interfaces so a phone on the same Wi-Fi can reach it.
app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[server] could not listen on port ${port}: ${err.code || err.message}`);
    process.exit(1);
  }
  console.log(`CallAi API listening on http://0.0.0.0:${port} (CALL_MODE=${callMode()})`);
  resumeUnfinished();
});
