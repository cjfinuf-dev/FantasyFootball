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
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
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

module.exports = { validateSignup, validateSignin };
