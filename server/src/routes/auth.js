const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth');
const { validateSignup, validateSignin } = require('../middleware/validate');
const { signToken, signRefreshToken, verifyRefreshToken, blacklistToken } = require('../utils/jwt');

const router = express.Router();

function setTokenCookies(res, token, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('ff-token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 60 * 1000,
  });
  res.cookie('ff-refresh-token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearTokenCookies(res) {
  res.clearCookie('ff-token', { path: '/' });
  res.clearCookie('ff-refresh-token', { path: '/api/auth' });
}

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
    const { user, token, refreshToken } = await authService.signup({ name, email, password });
    setTokenCookies(res, token, refreshToken);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/signin', signinLimiter, validateSignin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.signin({ email, password });
    setTokenCookies(res, token, refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/signout', (req, res) => {
  const refreshToken = req.cookies?.['ff-refresh-token'];
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.jti) {
        blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
      }
    } catch (_) {
      // Token already invalid — no-op
    }
  }
  clearTokenCookies(res);
  res.json({ success: true });
});

router.post('/logout', (req, res) => {
  const refreshToken = req.cookies?.['ff-refresh-token'];
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.jti) {
        blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
      }
    } catch (_) {
      // Token already invalid — no-op
    }
  }
  clearTokenCookies(res);
  res.json({ success: true });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.['ff-refresh-token'];
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }
    const payload = verifyRefreshToken(refreshToken);
    // Blacklist the old refresh token after successful verification (rotate)
    if (payload.jti) {
      blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
    }
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    const token = signToken({ userId: user.id, email: user.email });
    const newRefreshToken = signRefreshToken(user.id);
    setTokenCookies(res, token, newRefreshToken);
    res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
