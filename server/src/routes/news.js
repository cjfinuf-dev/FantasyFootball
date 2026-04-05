const express = require('express');
const { getNews, fetchAndStoreNews } = require('../services/news.service');
const { getActiveSituationEvents } = require('../services/situation.service');

const router = express.Router();

// Public endpoint — no auth required
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 15, 50);
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

// Dev-only manual trigger
router.post('/sweep', async (req, res, next) => {
  try {
    console.log('[News] Manual sweep triggered');
    const result = await fetchAndStoreNews();
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
