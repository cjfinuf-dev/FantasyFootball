const express = require('express');
const { addClient, removeClient, getLastState, getClientCount } = require('../services/liveScoring.service');

const MAX_SSE_CLIENTS = 500;
const MAX_SSE_CLIENTS_PER_IP = 3;
const router = express.Router();

// Per-IP concurrent connection count for the SSE endpoint. Prevents a single
// host from opening hundreds of long-lived sockets and starving other users.
const sseClientsByIp = new Map();
function incIp(ip) { sseClientsByIp.set(ip, (sseClientsByIp.get(ip) || 0) + 1); }
function decIp(ip) {
  const n = (sseClientsByIp.get(ip) || 0) - 1;
  if (n <= 0) sseClientsByIp.delete(ip);
  else sseClientsByIp.set(ip, n);
}

// GET /api/live/stream — SSE endpoint (no auth, public scoreboard data)
router.get('/stream', (req, res) => {
  if (getClientCount() >= MAX_SSE_CLIENTS) {
    return res.status(503).json({ error: 'Too many live connections. Try again later.' });
  }
  const ip = req.ip || 'unknown';
  if ((sseClientsByIp.get(ip) || 0) >= MAX_SSE_CLIENTS_PER_IP) {
    return res.status(429).json({ error: 'Too many concurrent live connections from this address.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial state if available
  const last = getLastState();
  if (last) {
    res.write(`event: scores\ndata: ${JSON.stringify(last)}\n\n`);
  }

  // Register for future broadcasts
  addClient(res);
  incIp(ip);

  // Heartbeat every 30s to prevent proxy timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
      removeClient(res);
      decIp(ip);
    }
  }, 30_000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
    decIp(ip);
  });
});

// ─── Snapshot cache (30s) ───
// Snapshot data is fully public, so cache a single global payload instead of
// per-IP (which wasted memory and opened an OOM vector via spoofed
// X-Forwarded-For headers if the proxy chain were ever misconfigured).
const SNAPSHOT_CACHE_TTL_MS = 30_000;
let snapshotCacheEntry = null; // { at, payload } | null

// GET /api/live/snapshot — poll-friendly fallback + initial hydrate + visibility resume
router.get('/snapshot', (req, res) => {
  const now = Date.now();
  if (snapshotCacheEntry && now - snapshotCacheEntry.at <= SNAPSHOT_CACHE_TTL_MS) {
    return res.json(snapshotCacheEntry.payload);
  }
  const last = getLastState();
  const payload = last || { timestamp: null, week: null, games: {}, players: {} };
  snapshotCacheEntry = { at: now, payload };
  res.json(payload);
});

module.exports = router;
