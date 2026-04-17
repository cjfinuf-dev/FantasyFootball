const express = require('express');
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
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('ff-token', { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' });
  res.clearCookie('ff-refresh-token', { path: '/api/auth', httpOnly: true, secure: isProduction, sameSite: 'strict' });
}

// Rate limiting is handled globally in index.js — no per-route limiters here
// to avoid double-counting (separate stores = 2x the allowed attempts)

router.post('/signup', validateSignup, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { user, token, refreshToken } = await authService.signup({ name, email, password });
    setTokenCookies(res, token, refreshToken);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// Sanitize user-derived strings before they hit logs so CRLF or tab injections
// can't forge aggregated-log entries.
function stripCtl(s) {
  return String(s ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 200);
}

router.post('/signin', validateSignin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.signin({ email, password });
    setTokenCookies(res, token, refreshToken);
    res.json({ user });
  } catch (err) {
    // Log failed signin attempts for credential-stuffing / brute-force visibility.
    // Do not log passwords; redact the email to its local-part initial only.
    const emailPreview = stripCtl((req.body?.email || '').replace(/(.).*@/, '$1***@'));
    console.warn('[auth] signin failed', {
      email: emailPreview,
      ip: stripCtl(req.ip),
      reason: stripCtl(err?.message || 'unknown'),
    });
    next(err);
  }
});

router.post('/signout', async (req, res) => {
  const refreshToken = req.cookies?.['ff-refresh-token'];
  if (refreshToken) {
    try {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload.jti) {
        await blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
      }
    } catch (_) {
      // Token already invalid — no-op
    }
  }
  clearTokenCookies(res);
  res.json({ success: true });
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.['ff-refresh-token'];
  if (refreshToken) {
    try {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload.jti) {
        await blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
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
    const payload = await verifyRefreshToken(refreshToken);
    // Blacklist the old refresh token after successful verification (rotate)
    if (payload.jti) {
      await blacklistToken(payload.jti, payload.exp ? payload.exp * 1000 : undefined);
    }
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    const token = signToken({ userId: user.id, email: user.email, tv: user.token_version ?? 0 });
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
