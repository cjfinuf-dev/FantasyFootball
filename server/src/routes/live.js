const express = require('express');
const { addClient, removeClient, getLastState, getClientCount } = require('../services/liveScoring.service');

const MAX_SSE_CLIENTS = 500;
const router = express.Router();

// GET /api/live/stream — SSE endpoint (no auth, public scoreboard data)
router.get('/stream', (req, res) => {
  if (getClientCount() >= MAX_SSE_CLIENTS) {
    return res.status(503).json({ error: 'Too many live connections. Try again later.' });
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

  // Heartbeat every 30s to prevent proxy timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
      removeClient(res);
    }
  }, 30_000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

module.exports = router;
