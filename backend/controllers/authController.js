const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretenigmanoteskey_2026', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      const userExists = await mockDb.findUserByUsername(username);
      if (userExists) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      const user = await mockDb.createUser(username, password);
      return res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id)
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Create user (pre-save hook hashes password)
    const user = await User.create({
      username,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      const user = await mockDb.findUserByUsername(username);
      if (user && (await mockDb.matchPassword(password, user.password))) {
        return res.json({
          _id: user._id,
          username: user.username,
          token: generateToken(user._id)
        });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // Check for user username
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
