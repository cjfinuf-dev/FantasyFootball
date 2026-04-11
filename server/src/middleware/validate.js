function validateSignup(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be under 100 characters.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters.' });
  }
  if (password.length > 72) {
    return res.status(400).json({ error: 'Password must be under 72 characters.' });
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit.' });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
}

function validateSignin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

// Zod-based validation for API routes
const { z } = require('zod');

function zodValidate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues.map(i => i.message).join('; ');
      return res.status(400).json({ error: msg });
    }
    req.body = result.data;
    next();
  };
}

const createLeagueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.string().max(50).optional().default('redraft'),
  scoringPreset: z.string().max(50).optional().default('standard'),
  scoringJson: z.string().optional(),
  rosterJson: z.string().optional(),
  leagueSize: z.number().int().min(2).max(32).optional().default(12),
  season: z.string().min(1, 'Season is required').max(20),
  settingsJson: z.string().optional(),
  teamName: z.string().min(1, 'Team name is required').max(100),
});

const joinLeagueSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required').max(20),
  teamName: z.string().min(1, 'Team name is required').max(100),
});

const saveDraftSchema = z.object({
  picks: z.array(z.object({
    pickNumber: z.number(),
    round: z.number(),
    pickInRound: z.number(),
    teamId: z.string(),
    playerId: z.string(),
  })),
  draftOrder: z.array(z.string()),
});

const validateCreateLeague = zodValidate(createLeagueSchema);
const validateJoinLeague = zodValidate(joinLeagueSchema);
const validateSaveDraft = zodValidate(saveDraftSchema);

module.exports = { validateSignup, validateSignin, validateCreateLeague, validateJoinLeague, validateSaveDraft };
