const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getAllHistoricalStats, updateSeason, updatePlayer } = require('../services/stats.service');

const router = express.Router();

// Public — fetch all historical stats
router.get('/historical', (req, res, next) => {
  try {
    const data = getAllHistoricalStats();
    res.json(data);
  } catch (err) { next(err); }
});

// TODO: Implement a proper role system (users table has no role column yet).
// Until then, these endpoints return 403 unconditionally.

// Admin only — update an entire season's data
router.put('/season/:year', requireAuth, (req, res) => {
  return res.status(403).json({ error: 'Admin endpoints not yet available.' });
});

// Admin only — update a single player's history
router.put('/player/:playerId', requireAuth, (req, res) => {
  return res.status(403).json({ error: 'Admin endpoints not yet available.' });
});

module.exports = router;
