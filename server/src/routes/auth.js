const express = require('express');
const authService = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth');
const { validateSignup, validateSignin } = require('../middleware/validate');

const router = express.Router();

router.post('/signup', validateSignup, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/signin', validateSignin, async (req, res, next) => {
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

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
