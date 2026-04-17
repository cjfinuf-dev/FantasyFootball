const { verifyToken } = require('../utils/jwt');
const { getUserById } = require('../services/auth.service');

async function requireAuth(req, res, next) {
  // Read JWT from httpOnly cookie; fall back to Authorization header for backwards compat
  const token = req.cookies?.['ff-token'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyToken(token);
    const user = await getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    // Enforce token_version — lets signout-all / password-change invalidate
    // all outstanding access tokens before their 30-minute natural expiry.
    // Tokens issued before the `tv` field existed (payload.tv === undefined)
    // are accepted until they expire naturally.
    if (payload.tv !== undefined && payload.tv !== (user.token_version ?? 0)) {
      return res.status(401).json({ error: 'Token has been invalidated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
