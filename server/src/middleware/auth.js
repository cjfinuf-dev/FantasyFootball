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
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
