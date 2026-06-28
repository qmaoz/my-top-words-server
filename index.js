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

const app = express();

const allowedOrigin = process.env.NODE_ENV === 'production' 
  ? 'https://my-top-words.vercel.app' 
  : 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
  })
  .catch(err => console.error('Error syncing database: ', err));

// User routes
app.post('/auth/register', Validation.registerValidation, UserController.register);
app.post('/auth/login', Validation.loginValidation, UserController.login);
app.get('/userinfo', UserController.verifyToken, UserController.userinfo);



// WordSet routes
app.post('/word-sets', UserController.verifyToken, Validation.wordSetValidation, WordSetController.create);
app.get('/word-sets', UserController.verifyTokenOptional, WordSetController.getAll);
app.get('/word-sets/:wordSetId', UserController.verifyTokenOptional, WordSetController.getOne);
app.patch('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, Validation.wordSetValidation, WordSetController.update);
app.patch('/word-sets/toggle-save/:wordSetId', UserController.verifyToken, UsersWordSetsController.toggleSaving);
app.patch('/word-sets/:wordSetId/words/:wordId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordsWordSetsController.toggleIncludeWordInWordSet);
app.delete('/word-sets/:wordSetId', UserController.verifyToken, WordSetController.verifyWordSetAuthor, WordSetController.remove);



// Word routes
app.post('/words', UserController.verifyToken, Validation.wordValidation, WordController.create);
app.get('/words', UserController.verifyTokenOptional, WordController.getAll);
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
