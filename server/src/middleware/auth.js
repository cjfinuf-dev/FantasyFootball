const { verifyToken } = require('../utils/jwt');
const { getUserById } = require('../services/auth.service');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = header.slice(7);

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
