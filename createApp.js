const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const Validation = require('./validation/validations.js');
const UserController = require('./controllers/UserController.js');
const WordSetController = require('./controllers/WordSetController.js');
const WordController = require('./controllers/WordController.js');
const UsersWordSetsController = require('./controllers/UsersWordSetsController.js');
const WordsWordSetsController = require('./controllers/WordsWordSetsController.js');
const LearnedUserWordsController = require('./controllers/LearnedUserWordsController.js');
const StatsController = require('./controllers/StatsController.js');
const FeedbackController = require('./controllers/FeedbackController.js');
const WordSetRemarkController = require('./controllers/WordSetRemarkController.js');
const AdminController = require('./controllers/AdminController.js');
const { verifyAdmin } = require('./middleware/admin.js');
const { authRateLimit } = require('./middleware/rateLimit.js');

function createApp() {
  const app = express();

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? 'https://my-top-words.vercel.app'
    : 'http://localhost:5173';

  app.use(helmet());
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.post('/auth/register', authRateLimit, Validation.registerValidation, UserController.register);
  app.post('/auth/login', authRateLimit, Validation.loginValidation, UserController.login);
  app.get('/userinfo', UserController.verifyToken, UserController.userinfo);
  app.patch('/user/preferences', UserController.verifyToken, UserController.updatePreferences);
  app.delete('/user', UserController.verifyToken, UserController.deleteAccount);

  app.get('/stats', StatsController.getPublic);

  app.post('/feedback', UserController.verifyTokenOptional, Validation.feedbackValidation, FeedbackController.create);
  app.post('/word-sets/:wordSetId/remarks', UserController.verifyTokenOptional, Validation.wordSetRemarkValidation, WordSetRemarkController.create);
  app.get('/me/word-set-remarks', UserController.verifyToken, WordSetRemarkController.listForOwnerInbox);
  app.get('/word-sets/:wordSetId/remarks', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordSetRemarkController.listForWordSet);
  app.patch('/word-set-remarks/:id', UserController.verifyToken, Validation.wordSetRemarkUpdateValidation, WordSetRemarkController.update);

  app.get('/admin/overview', UserController.verifyToken, verifyAdmin, AdminController.getOverview);
  app.get('/admin/feedback', UserController.verifyToken, verifyAdmin, FeedbackController.getAll);
  app.patch('/admin/feedback/:id', UserController.verifyToken, verifyAdmin, Validation.feedbackUpdateValidation, FeedbackController.update);
  app.get('/admin/users', UserController.verifyToken, verifyAdmin, AdminController.getUsers);
  app.delete('/admin/users/:userId', UserController.verifyToken, verifyAdmin, AdminController.deleteUser);

  app.post('/word-sets', UserController.verifyToken, Validation.wordSetValidation, WordSetController.create);
  app.get('/word-sets', UserController.verifyTokenOptional, WordSetController.getAll);
  app.get('/word-sets/:wordSetId', UserController.verifyTokenOptional, WordSetController.getOne);
  app.patch('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.wordSetValidation, WordSetController.update);
  app.patch('/word-sets/toggle-save/:wordSetId', UserController.verifyToken, UsersWordSetsController.toggleSaving);
  app.patch('/word-sets/:wordSetId/words/:wordId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordsWordSetsController.toggleIncludeWordInWordSet);
  app.post('/word-sets/:wordSetId/words/bulk', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.bulkWordsValidation, WordsWordSetsController.bulkImportWords);
  app.put('/word-sets/:wordSetId/words/sync', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.syncWordsValidation, WordsWordSetsController.syncWordSetWords);
  app.delete('/word-sets/:wordSetId/words', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordsWordSetsController.clearWordSet);
  app.delete('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordSetController.remove);

  app.post('/words', UserController.verifyToken, Validation.wordValidation, WordController.create);
  app.get('/words', UserController.verifyTokenOptional, WordController.getAll);
  app.patch('/words/toggle-learned/:wordId', UserController.verifyToken, LearnedUserWordsController.toggleLearned);
  app.patch('/words/:wordId/review', UserController.verifyToken, LearnedUserWordsController.reviewWord);
  app.patch('/words/:wordId', UserController.verifyToken, WordController.verifyWordAuthor, Validation.wordValidation, WordController.update);
  app.delete('/words/:wordId', UserController.verifyToken, WordController.verifyWordAuthor, WordController.remove);

  return app;
}

module.exports = createApp;
