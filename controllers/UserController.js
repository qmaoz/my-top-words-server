const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { User } = require('../models/models');
const { consoleError } = require('../utils');
const { respondServerError, respondAuthTokenError } = require('../utils/apiResponse');
const { isSupportedLocale } = require('../utils/locales');
const { touchLastSeen } = require('../middleware/trackLastSeen');

async function register(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      consoleError('Registration error:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Registration error',
        message: errors.array()[0].msg
      });
    }

    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: passwordHash,
      created_at: new Date(),
      last_seen_at: new Date(),
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d'
    });

    touchLastSeen(user.id);

    const { ...userData } = user['dataValues'];
    delete userData.password;

    return res.status(201).json({
      message: 'User registered successfully',
      userData,
      token
    });
  } catch (error) {
    return respondServerError(res, 'Registration error', error);
  }
}

async function login(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        source: 'Authentication error',
        message: errors.array()[0].msg
      });
    }

    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({
        source: 'Authentication error',
        message: 'Invalid username or password'
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        source: 'Authentication error',
        message: 'Invalid username or password'
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d'
    });

    touchLastSeen(user.id);

    const { ...userData } = user['dataValues'];
    delete userData.password;

    res.json({ userData, token });
  } catch (error) {
    return respondServerError(res, 'Authentication error', error);
  }
}

async function userinfo(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(400).json({
        source: 'Failed to load user data',
        message: 'User not found'
      });
    }

    const { ...userData } = user['dataValues'];
    delete userData.password;

    res.json({ userData });
  } catch (error) {
    return respondServerError(res, 'Failed to load user data', error);
  }
}

async function updatePreferences(req, res) {
  try {
    const { preferred_translation_locale, ui_locale } = req.body;

    for (const locale of [preferred_translation_locale, ui_locale]) {
      if (locale != null && !isSupportedLocale(locale)) {
        return res.status(400).json({
          source: 'Failed to update settings',
          message: 'Unsupported language',
        });
      }
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        source: 'Failed to update settings',
        message: 'User not found',
      });
    }

    if (preferred_translation_locale != null) {
      user.preferred_translation_locale = preferred_translation_locale;
    }
    if (ui_locale != null) {
      user.ui_locale = ui_locale;
    }
    await user.save();

    return res.json({
      preferred_translation_locale: user.preferred_translation_locale,
      ui_locale: user.ui_locale,
    });
  } catch (error) {
    return respondServerError(res, 'Failed to update settings', error);
  }
}

async function deleteAccount(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        source: 'Failed to delete account',
        message: 'User not found',
      });
    }

    if (user.is_admin) {
      return res.status(400).json({
        source: 'Failed to delete account',
        message: 'Admin accounts cannot be deleted by the user',
      });
    }

    await user.destroy();

    return res.json({ message: 'Account deleted' });
  } catch (error) {
    return respondServerError(res, 'Failed to delete account', error);
  }
}

function verifyToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({
      source: 'Token verification error',
      message: 'Access denied'
    });
  }

  try {
    const decoded = jwt.verify(
      token.split(' ')[1],
      process.env.JWT_SECRET_KEY,
      { algorithms: ['HS256'] }
    );

    req.userId = decoded.userId;
    touchLastSeen(req.userId);
    next();
  } catch (error) {
    consoleError('Token verification error: ' + error.message);
    return respondAuthTokenError(res);
  }
}

function verifyTokenOptional(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token.split(' ')[1],
      process.env.JWT_SECRET_KEY,
      { algorithms: ['HS256'] }
    );

    req.userId = decoded.userId;
    touchLastSeen(req.userId);
    next();
  } catch (error) {
    consoleError('Token verification error: ', error.message);
    next();
  }
}

module.exports = { register, login, userinfo, updatePreferences, deleteAccount, verifyToken, verifyTokenOptional };
