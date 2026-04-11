const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth');
const { validateSignup, validateSignin } = require('../middleware/validate');
const { signToken, verifyRefreshToken } = require('../utils/jwt');

const router = express.Router();

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Try again in an hour.' },
});

router.post('/signup', signupLimiter, validateSignup, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/signin', signinLimiter, validateSignin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.signin({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/signout', (req, res) => {
  res.json({ success: true });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }
    const payload = verifyRefreshToken(refreshToken);
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
