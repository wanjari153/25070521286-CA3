const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  res.status(201).json({
    token: makeToken(user._id),
    user: { name: user.name, email: user.email },
  });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.status(400).json({ message: 'Wrong email or password' });

  const match = await bcrypt.compare(password || '', user.password);
  if (!match) return res.status(400).json({ message: 'Wrong email or password' });

  res.json({
    token: makeToken(user._id),
    user: { name: user.name, email: user.email },
  });
});

// WHO AM I (used by the dashboard)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('name email');
  res.json(user);
});

module.exports = router;