const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

// Load backend/.env for local development. In production (e.g. Render) the
// real environment variables are already set and no .env file exists, so the
// try/catch makes this a safe no-op there.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // No .env file present — fall back to the existing process environment.
}

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rsvps.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
// Google Apps Script Web App URL that appends each RSVP to a Google Sheet.
const SHEETS_WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL || '';
// Optional shared secret checked inside the Apps Script to reject spam.
const SHEETS_WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET || '';

app.use(express.json());

// CORS only needed when frontend is served from a different origin (local dev).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) await fsp.writeFile(DATA_FILE, '[]', 'utf-8');
}

async function readRsvps() {
  await ensureDataFile();
  const raw = await fsp.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRsvps(list) {
  await ensureDataFile();
  await fsp.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// Forward an RSVP to a Google Sheet via a Google Apps Script Web App.
// Failures here never block the RSVP: the entry is always kept in the local
// JSON backup, and the error is logged for later inspection.
async function forwardToSheet(entry) {
  if (!SHEETS_WEBHOOK_URL) return;
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, secret: SHEETS_WEBHOOK_SECRET }),
    });
    if (!res.ok) {
      console.error('Google Sheet webhook responded with status', res.status);
    }
  } catch (err) {
    console.error('Failed to forward RSVP to Google Sheet:', err.message);
  }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/rsvp', async (req, res) => {
  const { guestName, attending, guestCount, message } = req.body || {};

  if (!guestName || typeof guestName !== 'string' || !guestName.trim()) {
    return res.status(400).json({ error: 'guestName is required' });
  }
  if (!['yes', 'no'].includes(attending)) {
    return res.status(400).json({ error: 'attending must be "yes" or "no"' });
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    guestName: guestName.trim().slice(0, 100),
    attending,
    guestCount: Math.min(Math.max(Number(guestCount) || 1, 1), 10),
    message: typeof message === 'string' ? message.trim().slice(0, 500) : '',
    submittedAt: new Date().toISOString(),
  };

  try {
    const list = await readRsvps();
    list.push(entry);
    await writeRsvps(list);
    await forwardToSheet(entry);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to save RSVP:', err);
    res.status(500).json({ error: 'Could not save RSVP' });
  }
});

// Simple admin listing, protected by a shared key (set ADMIN_KEY env var).
app.get('/api/rsvp', async (req, res) => {
  if (!ADMIN_KEY || req.header('X-Admin-Key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const list = await readRsvps();
  res.json(list);
});

// Serve the static frontend.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Invitation server running on http://localhost:${PORT}`);
});
