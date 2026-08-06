const express = require('express');
const { validationResult } = require('express-validator');
const request = require('supertest');

const { wordValidation, bulkWordsValidation } = require('../validation/validations');

function buildValidationApp(rules) {
  const app = express();
  app.use(express.json());
  app.post('/test', rules, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    return res.status(200).json({ ok: true });
  });
  return app;
}

describe('wordValidation (translations)', () => {
  const app = buildValidationApp(wordValidation);

  it('accepts a word with valid translations', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: {
        uk: { word_translation: 'дім', sentence_translation: 'Дім великий.' },
      },
    });
    expect(res.status).toBe(200);
  });

  it('rejects when translations are missing', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: {},
    });
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported translation locale', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: { zz: { word_translation: 'x', sentence_translation: 'y' } },
    });
    expect(res.status).toBe(400);
  });

  it('rejects an empty word', async () => {
    const res = await request(app).post('/test').send({
      word_text: '',
      sentence_text: 'a',
      translations: { uk: { word_translation: 'дім', sentence_translation: 'Дім.' } },
    });
    expect(res.status).toBe(400);
  });
});

describe('bulkWordsValidation (translations)', () => {
  const app = buildValidationApp(bulkWordsValidation);

  it('accepts an array with two translation locales', async () => {
    const res = await request(app).post('/test').send({
      words: [
        {
          word_text: 'Haus',
          sentence_text: 'Das Haus ist groß.',
          translations: {
            uk: { word_translation: 'дім', sentence_translation: 'Дім великий.' },
            ru: { word_translation: 'дом', sentence_translation: 'Дом большой.' },
          },
        },
      ],
    });
    expect(res.status).toBe(200);
  });

  it('rejects a word without translations in the array', async () => {
    const res = await request(app).post('/test').send({
      words: [{ word_text: 'Haus', sentence_text: 'a', translations: {} }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects an empty array', async () => {
    const res = await request(app).post('/test').send({ words: [] });
    expect(res.status).toBe(400);
  });
});
