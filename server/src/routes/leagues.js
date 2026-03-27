const express = require('express');
const { requireAuth } = require('../middleware/auth');
const leagueService = require('../services/league.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const leagues = await leagueService.getUserLeagues(req.user.id);
    res.json({ leagues });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, type, scoringPreset, scoringJson, rosterJson, leagueSize, season, settingsJson, teamName } = req.body;
    if (!name || !season || !teamName) {
      return res.status(400).json({ error: 'Name, season, and team name are required.' });
    }
    const league = await leagueService.createLeague({
      name, type: type || 'redraft', scoringPreset: scoringPreset || 'standard',
      scoringJson, rosterJson, leagueSize: leagueSize || 12, season,
      settingsJson, teamName, userId: req.user.id,
    });
    res.status(201).json({ league });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const league = await leagueService.getLeagueById(Number(req.params.id), req.user.id);
    res.json({ league });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const league = await leagueService.updateLeague(Number(req.params.id), req.user.id, req.body);
    res.json({ league });
  } catch (err) { next(err); }
});

module.exports = router;
