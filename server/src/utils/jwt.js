const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('[jwt] JWT_SECRET environment variable is not set — refusing to start without a signing secret');
}
const ACCESS_EXPIRES_IN = '30m';
const REFRESH_EXPIRES_IN = '7d';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES_IN, algorithm: 'HS256' });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, SECRET, { expiresIn: REFRESH_EXPIRES_IN, algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken };
