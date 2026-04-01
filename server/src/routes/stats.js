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

// Auth required — update an entire season's data
router.put('/season/:year', requireAuth, async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Invalid season year' });
    }
    const result = await updateSeason(year, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// Auth required — update a single player's history
router.put('/player/:playerId', requireAuth, async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const result = await updatePlayer(playerId, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
