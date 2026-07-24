const { body } = require('express-validator');
const { User } = require('../models/models');
const { isSupportedLocale } = require('../utils/locales');

const MAX_FIELD_LENGTH = 255;

// Validates a translations map: { [locale]: { word_translation, sentence_translation } }.
// Requires at least one supported locale with both fields filled and within length limits.
function validateTranslationsMap(translations) {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    throw new Error('Translations must be an object keyed by locale');
  }

  const entries = Object.entries(translations);
  if (entries.length === 0) {
    throw new Error('At least one translation is required');
  }

  let filledCount = 0;

  for (const [locale, value] of entries) {
    if (!isSupportedLocale(locale)) {
      throw new Error(`Unsupported translation locale: ${locale}`);
    }
    if (!value || typeof value !== 'object') {
      throw new Error(`Translation for "${locale}" must be an object`);
    }

    const wordTranslation = String(value.word_translation ?? '').trim();
    const sentenceTranslation = String(value.sentence_translation ?? '').trim();

    if (wordTranslation === '' && sentenceTranslation === '') {
      continue;
    }

    if (wordTranslation.length > MAX_FIELD_LENGTH || sentenceTranslation.length > MAX_FIELD_LENGTH) {
      throw new Error(`Translation for "${locale}" is too long (max ${MAX_FIELD_LENGTH})`);
    }

    filledCount += 1;
  }

  if (filledCount === 0) {
    throw new Error('At least one filled translation is required');
  }

  return true;
}

const messages = {
  'incorrect username length': 'Username must be 1–20 characters',
  'username already taken': 'This username is already taken',

  'incorrect password length': 'Password must be 12–20 characters',
  'minimum one small letter in password': 'Password must contain at least one lowercase letter',
  'minimum one big letter in password': 'Password must contain at least one uppercase letter',
  'minimum one digit in password': 'Password must contain at least one digit',
  'minimum one special character in password': 'Password must contain at least one special character (!@#$%^&*()_=+/\\~`\'"-)',
  'the passwords do not match': 'Passwords do not match',
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage(messages['incorrect username length'])
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
    .withMessage(messages['incorrect username length']),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password cannot be empty'),
];

const wordSetValidation = [
  body('name')
    .optional()
    .trim()
    .isString()
    .withMessage('Set name must be a string')
    .isLength({ min: 1, max: 30 })
    .withMessage('Set name must be 1–30 characters'),
  body('visibility')
    .optional()
    .trim()
    .isIn(['private', 'unlisted', 'public'])
    .withMessage('Invalid set visibility'),
  body('source_locale')
    .optional()
    .custom((value) => {
      if (!isSupportedLocale(value)) {
        throw new Error('Unsupported set language');
      }
      return true;
    }),
  body('translation_locales')
    .optional()
    .isArray()
    .withMessage('Translation locales must be an array')
    .custom((value) => {
      for (const code of value) {
        if (!isSupportedLocale(code)) {
          throw new Error(`Unsupported translation locale: ${code}`);
        }
      }
      return true;
    }),
];

const wordValidation = [
  body('word_text')
    .trim()
    .isString()
    .withMessage('Word must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Word must be 1–255 characters'),
  body('sentence_text')
    .trim()
    .isString()
    .withMessage('Sentence must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Sentence must be 1–255 characters'),
  body('translations')
    .custom(validateTranslationsMap),
];

const FEEDBACK_TYPES = ['typo', 'bug', 'suggestion', 'other'];
const FEEDBACK_STATUSES = ['queued', 'in_progress', 'done'];

const feedbackValidation = [
  body('type')
    .trim()
    .isIn(FEEDBACK_TYPES)
    .withMessage('Invalid message type'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message text must be 1–2000 characters'),
  body('page_url')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Page path is too long')
    .matches(/^\/[a-zA-Z0-9/_-]*$/)
    .withMessage('Only an internal path is allowed, e.g. /about'),
];

const feedbackUpdateValidation = [
  body('status')
    .optional()
    .trim()
    .isIn(FEEDBACK_STATUSES)
    .withMessage('Invalid status'),
  body('admin_note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Admin note is too long'),
];

const wordSetRemarkValidation = [
  body('selected_text')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Selected text is too long'),
  body('comment')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Comment is too long'),
  body('word_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Invalid word id'),
];

const wordSetRemarkUpdateValidation = [
  body('status')
    .optional()
    .trim()
    .isIn(['queued', 'done'])
    .withMessage('Invalid status'),
  body('owner_note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Note is too long'),
];

const bulkWordsValidation = [
  body('words')
    .isArray({ min: 1, max: 100 })
    .withMessage('An array of 1–100 words is required'),
  body('words.*.word_text')
    .trim()
    .isString()
    .withMessage('Word must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Word must be 1–255 characters'),
  body('words.*.sentence_text')
    .trim()
    .isString()
    .withMessage('Sentence must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Sentence must be 1–255 characters'),
  body('words.*.translations')
    .custom(validateTranslationsMap),
];

const syncWordsValidation = [
  body('words')
    .isArray({ max: 2000 })
    .withMessage('An array of up to 2000 words is required'),
  body('words.*.word_text')
    .trim()
    .isString()
    .withMessage('Word must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Word must be 1–255 characters'),
  body('words.*.sentence_text')
    .trim()
    .isString()
    .withMessage('Sentence must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Sentence must be 1–255 characters'),
  body('words.*.translations')
    .custom(validateTranslationsMap),
];

module.exports = {
  registerValidation,
  loginValidation,
  wordSetValidation,
  wordValidation,
  feedbackValidation,
  feedbackUpdateValidation,
  bulkWordsValidation,
  syncWordsValidation,
  wordSetRemarkValidation,
  wordSetRemarkUpdateValidation,
};
