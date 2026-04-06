const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateCreateLeague, validateJoinLeague, validateSaveDraft } = require('../middleware/validate');
const leagueService = require('../services/league.service');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const leagues = await leagueService.getUserLeagues(req.user.id);
    res.json({ leagues });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, validateCreateLeague, async (req, res, next) => {
  try {
    const { name, type, scoringPreset, scoringJson, rosterJson, leagueSize, season, settingsJson, teamName } = req.body;
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

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await leagueService.deleteLeague(Number(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id/members/:memberId', requireAuth, async (req, res, next) => {
  try {
    const league = await leagueService.removeMember(Number(req.params.id), Number(req.params.memberId), req.user.id);
    res.json({ league });
  } catch (err) { next(err); }
});

// Join league via invite code
router.post('/join', requireAuth, validateJoinLeague, async (req, res, next) => {
  try {
    const { inviteCode, teamName } = req.body;
    const league = await leagueService.joinLeague({ inviteCode, teamName, userId: req.user.id });
    res.json({ league });
  } catch (err) { next(err); }
});

// Draft endpoints
router.post('/:id/draft', requireAuth, validateSaveDraft, async (req, res, next) => {
  try {
    const { picks, draftOrder } = req.body;
    await leagueService.saveDraft(Number(req.params.id), req.user.id, { picks, draftOrder });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/:id/draft', requireAuth, async (req, res, next) => {
  try {
    const draft = await leagueService.getDraft(Number(req.params.id), req.user.id);
    res.json({ draft });
  } catch (err) { next(err); }
});

router.delete('/:id/draft', requireAuth, async (req, res, next) => {
  try {
    await leagueService.deleteDraft(Number(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
