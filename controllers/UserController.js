const { validationResult } = require('express-validator'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const { User } = require('../models/models');
const { consoleError } = require('../utils');


dotenv.config({ quiet: true });

async function register(req, res) {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      consoleError('Помилка під час реєстрації користувача:', errors.array()[0].msg);
      return res.status(400).json({
        source: 'Помилка під час реєстрації користувача',
        message: errors.array()[0].msg
      });
    }
    
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: passwordHash
    });

    // generate a JWT to keep the user logged in immediately after registration
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '24h'
    });

    const { ...userData } = user['dataValues'];
    delete userData.password;

    return res.status(201).json({
      message: 'Користувач успішно зареєстрований',
      userData,
      token
    });
  } catch (error) {
    consoleError('Помилка під час реєстрації користувача: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час реєстрації користувача',
      message: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({
        source: 'Помилка під час авторизації',
        message: 'Неправильні дані для входу'
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        source: 'Помилка під час авторизації',
        message: 'Неправильні дані для входу'
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '24h'
    });

    const {...userData } = user['dataValues'];
    delete userData.password;

    res.json({ userData, token });
  } catch (error) {
    consoleError('Помилка під час авторизації: ', error.message);
    res.status(500).json({
      source: 'Помилка під час авторизації',
      message: error.message
    });
  }
}

async function userinfo(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(400).json({
        source: 'Помилка під час отримання даних користувача',
        message: 'Користувача не знайдено'
      });
    }

    const {...userData } = user['dataValues'];
    delete userData.password;

    res.json({ userData });
  } catch (error) {
    consoleError('Помилка під час отримання даних користувача: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час отримання даних користувача',
      message: error.message
    });
  }
}

function verifyToken (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({
      source: 'Помилка під час верифікації токена',
      message: 'Доступ заборонено'
    });
  }

  try {
    // extract the token from the "Bearer <token>" string format
    const decoded = jwt.verify(
      token.split(' ')[1],
      process.env.JWT_SECRET_KEY
    );

    // pass the decoded user ID to the next middleware/controller
    req.userId = decoded.userId;
    next();
  } catch (error) {
    consoleError('Помилка під час перевірки токена: ' + error.message);
    res.status(500).json({
      source: 'Помилка під час перевірки токена',
      message: error.message
    });
  }
}

function checkAuthOptional (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return next();
  }

  try {
    // extract the token from the "Bearer <token>" string format
    const decoded = jwt.verify(
      token.split(' ')[1],
      process.env.JWT_SECRET_KEY
    );

    // pass the decoded user ID to the next middleware/controller
    req.userId = decoded.userId;
    next();
  } catch (error) {
    consoleError('Помилка під час перевірки токена: ', error.message);
    next();
  }
}

module.exports = { register, login, userinfo, verifyToken, checkAuthOptional };