const dotenv = require('dotenv');
dotenv.config({ quiet: true });

const express = require('express');
const cors = require('cors');

const sequelize = require('./db');
const Validation = require('./validation/validations.js'); 
const UserController = require('./controllers/UserController.js');
const WordSetController = require('./controllers/WordSetController.js');
const WordController = require('./controllers/WordController.js');
const UsersWordSetsController = require('./controllers/UsersWordSetsController.js');
const WordsWordSetsController = require('./controllers/WordsWordSetsController.js');
const LearnedUserWordsController = require('./controllers/LearnedUserWordsController.js');
const StatsController = require('./controllers/StatsController.js');
const FeedbackController = require('./controllers/FeedbackController.js');
const AdminController = require('./controllers/AdminController.js');
const { verifyAdmin } = require('./middleware/admin.js');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const allowedOrigin = process.env.NODE_ENV === 'production'
  ? 'https://my-top-words.vercel.app' 
  : 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

sequelize.sync({ alter: true })
  .then(async () => {
    console.log('Database synced');
    try {
      await sequelize.query(`
        UPDATE word_sets
        SET visibility = CASE WHEN is_public = TRUE THEN 'public' ELSE 'private' END
        WHERE visibility IS NULL OR visibility = ''
      `);
    } catch (migrationError) {
      console.error('Visibility migration skipped: ', migrationError.message);
    }
  })
  .catch(err => console.error('Error syncing database: ', err));

// User routes
app.post('/auth/register', Validation.registerValidation, UserController.register);
app.post('/auth/login', Validation.loginValidation, UserController.login);
app.get('/userinfo', UserController.verifyToken, UserController.userinfo);

app.get('/stats', StatsController.getPublic);

app.post('/feedback', UserController.verifyTokenOptional, Validation.feedbackValidation, FeedbackController.create);

app.get('/admin/overview', UserController.verifyToken, verifyAdmin, AdminController.getOverview);
app.get('/admin/feedback', UserController.verifyToken, verifyAdmin, FeedbackController.getAll);
app.patch('/admin/feedback/:id', UserController.verifyToken, verifyAdmin, Validation.feedbackUpdateValidation, FeedbackController.update);
app.get('/admin/users', UserController.verifyToken, verifyAdmin, AdminController.getUsers);
app.delete('/admin/users/:userId', UserController.verifyToken, verifyAdmin, AdminController.deleteUser);



// WordSet routes
app.post('/word-sets', UserController.verifyToken, Validation.wordSetValidation, WordSetController.create);
app.get('/word-sets', UserController.verifyTokenOptional, WordSetController.getAll);
app.get('/word-sets/:wordSetId', UserController.verifyTokenOptional, WordSetController.getOne);
app.patch('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.wordSetValidation, WordSetController.update);
app.patch('/word-sets/toggle-save/:wordSetId', UserController.verifyToken, UsersWordSetsController.toggleSaving);
app.patch('/word-sets/:wordSetId/words/:wordId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordsWordSetsController.toggleIncludeWordInWordSet);
app.post('/word-sets/:wordSetId/words/bulk', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.bulkWordsValidation, WordsWordSetsController.bulkImportWords);
app.delete('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordSetController.remove);



// Word routes
app.post('/words', UserController.verifyToken, Validation.wordValidation, WordController.create);
app.get('/words', UserController.verifyTokenOptional, WordController.getAll);
app.patch('/words/toggle-learned/:wordId', UserController.verifyToken, LearnedUserWordsController.toggleLearned);
app.patch('/words/:wordId', UserController.verifyToken, WordController.verifyWordAuthor, Validation.wordValidation, WordController.update);
app.delete('/words/:wordId', UserController.verifyToken, WordController.verifyWordAuthor, WordController.remove);



const SERVER_PORT = process.env.SERVER_PORT || 3001;
if (require.main === module) {
  app.listen(SERVER_PORT, (err) => {
    if (err) {
      return console.error(err);
    }

    console.log(`Server running on port ${SERVER_PORT}`);
  });
}

module.exports = app;
