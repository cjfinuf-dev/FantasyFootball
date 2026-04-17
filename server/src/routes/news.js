const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { getNews, fetchAndStoreNews } = require('../services/news.service');
const { getActiveSituationEvents } = require('../services/situation.service');

const router = express.Router();

// Sweep is expensive (full RSS fan-out + DB writes). Cap one per user per
// hour, independent of the global /api/ limiter, so an authenticated user
// can't weaponize it for DoS or outbound-traffic amplification.
const sweepLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sweep already run recently. Try again in an hour.' },
});

// Public endpoint — no auth required
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
    const before = req.query.before || null;
    const category = req.query.category || null;
    const result = await getNews({ limit, before, category });
    res.json(result);
  } catch (err) { next(err); }
});

// Active situation events — feeds HexScore adjustments
router.get('/impacts', async (req, res, next) => {
  try {
    const events = await getActiveSituationEvents();
    res.json({ events });
  } catch (err) { next(err); }
});

// Dev-only manual trigger — requires auth + per-user hourly cap
router.post('/sweep', requireAuth, sweepLimiter, async (req, res, next) => {
  try {
    console.log('[News] Manual sweep triggered by user', req.user?.id);
    const result = await fetchAndStoreNews();
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
