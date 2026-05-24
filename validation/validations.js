const { body } = require('express-validator');
const { User } = require('../models/models');

const messages = {
  'incorrect username length': 'Ім\'я користувача має містити від 1 до 20 символів',
  'not allowed characters in username': 'Ім\'я користувача може містити тільки літери, цифри, дефіс або нижнє підкреслення!',
  'username already taken': 'Це ім\'я користувача вже використовується',

  'incorrect password length': 'Пароль має містити від 12 до 20 символів',
  'minimum one small letter in password': 'Пароль має містити принаймні одну малу літеру!',
  'minimum one big letter in password': 'Пароль має містити принаймні одну велику літеру!',
  'minimum one digit in password': 'Пароль має містити принаймні одну цифру!',
  'minimum one special character in password': 'Пароль має містити принаймні один спецсимвол (!@#$%^&*()_=+\/\\~`\'\"-)!',
  'the passwords do not match': 'Паролі не збігаються!',
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage(messages['incorrect username length'])
    .matches(/^[\w-]*$/)
    .withMessage(messages['not allowed characters in username'])
    .custom(async value => {
      const user = await User.findOne({ where: { username: value } });
      if (user) {
        throw new Error(messages['username already taken']);
      }
    }),
  body('password')
    .trim()
    .isLength({ min: 12, max: 20 })
    .withMessage(messages['incorrect password length'])

    .matches(/^(?=.*[a-z]).*$/)
    .withMessage(messages['minimum one small letter in password'])

    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage(messages['minimum one big letter in password'])

    .matches(/^(?=.*[0-9]).*$/)
    .withMessage(messages['minimum one digit in password'])

    .matches(/^(?=.*[!@#$%^&*()_=+\/\\~`'"-]).*$/)
    .withMessage(messages['minimum one special character in password']),
  body('confirm_password')
    .trim()
    .custom((value, { req }) => value === req.body.password)
    .withMessage(messages['the passwords do not match']),
];

const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage(messages['incorrect username length'])
    .matches(/^[\w-]*$/)
    .withMessage(messages['not allowed characters in username']),
  body('password')
    .trim()
    .isLength({ min: 12, max: 20 })
    .withMessage(messages['incorrect password length'])

    .matches(/^(?=.*[a-z]).*$/)
    .withMessage(messages['minimum one small letter in password'])

    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage(messages['minimum one big letter in password'])

    .matches(/^(?=.*[0-9]).*$/)
    .withMessage(messages['minimum one digit in password'])

    .matches(/^(?=.*[!@#$%^&*()_=+\/\\~`'"-]).*$/)
    .withMessage(messages['minimum one special character in password']),
];

const wordSetValidation = [
  body('name')
    .optional()
    .trim()
    .isString()
    .withMessage('Ім\'я набору має бути рядком!')
    .isLength({ min: 1, max: 30 })
    .withMessage('Назва набору повинна містити від 1 до 30 символів!')
];

const wordValidation = [
  body('word_text')
    .trim()
    .isString()
    .withMessage('Слово має бути рядком!')
    .isLength({ min: 1, max: 255 })
    .withMessage('Слово має містити від 1 до 255 символів!'),
  body('word_translation_uk')
    .trim()
    .isString()
    .withMessage('Переклад слова має бути рядком!')
    .isLength({ min: 1, max: 255 })
    .withMessage('Переклад слова має містити від 1 до 255 символів!'),
  body('sentence_text')
    .trim()
    .isString()
    .withMessage('Речення має бути рядком!')
    .isLength({ min: 1, max: 255 })
    .withMessage('Речення має містити від 1 до 255 символів!'),
  body('sentence_translation_uk')
    .trim()
    .isString()
    .withMessage('Переклад речення має бути рядком!')
    .isLength({ min: 1, max: 255 })
    .withMessage('Переклад речення повинен містити щонайменше 1 символ!')
];

module.exports = { registerValidation, loginValidation, wordSetValidation, wordValidation };