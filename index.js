/**
 * Routes provided:
 * - POST `/auth/register` — register a new user
 * - POST `/auth/login` — login and receive a JWT
 * - GET `/userinfo` — get information about the authenticated user
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const sequelize = require('./db');
const Validation = require('./validation/validations.js'); 
const UserController = require('./controllers/UserController.js');
const WordSetController = require('./controllers/WordSetController.js');
const WordController = require('./controllers/WordController.js');
const UsersWordSetsController = require('./controllers/UsersWordSetsController.js');
const WordsWordSetsController = require('./controllers/WordsWordSetsController.js');
const UsersWordsController = require('./controllers/UsersWordsController.js');

dotenv.config({ quiet: true });

const app = express();
app.use(cors());
app.use(express.json());

sequelize.sync()
  .then(() => {
    console.log('Database synced');
  })
  .catch(err => console.error('Error syncing database: ', err));



/** User routes */
app.post('/auth/register', Validation.registerValidation, UserController.register);
app.post('/auth/login', Validation.loginValidation, UserController.login);
app.get('/userinfo', UserController.verifyToken, UserController.userinfo);



/** Word set routes */
app.post('/word-sets', UserController.verifyToken, Validation.wordSetValidation, WordSetController.create);
app.post('/word-sets/:id/words', UserController.verifyToken, WordsWordSetsController.updateWordSetWords);
app.get('/word-sets', UserController.checkAuthOptional, WordSetController.getAll);
app.get('/word-sets/:id', UserController.checkAuthOptional, WordSetController.getOne);
app.patch('/word-sets/:id', UserController.verifyToken, Validation.wordSetValidation, WordSetController.update);
app.patch('/word-sets/toggle-save/:id', UserController.verifyToken, UsersWordSetsController.toggleSaving);
app.delete('/word-sets/:id', UserController.verifyToken, WordSetController.remove);
app.delete('/word-sets/:wordSetId/words/:wordId', UserController.verifyToken, WordsWordSetsController.removeFromSet);



/** Word routes */
app.post('/words', Validation.wordValidation, UserController.verifyToken, WordController.create);
app.get('/words', UserController.checkAuthOptional, WordController.getAll);
app.patch('/words/:id', UserController.verifyToken, WordController.update);
app.patch('/words/update-learning-status/:id', UserController.verifyToken, UsersWordsController.updateLearningStatus);
app.delete('/words/:id', UserController.verifyToken, WordController.remove);


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
