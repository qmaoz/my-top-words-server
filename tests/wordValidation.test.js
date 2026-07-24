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

  it('приймає слово з валідними перекладами', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: {
        uk: { word_translation: 'дім', sentence_translation: 'Дім великий.' },
      },
    });
    expect(res.status).toBe(200);
  });

  it('відхиляє, якщо немає перекладів', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: {},
    });
    expect(res.status).toBe(400);
  });

  it('відхиляє непідтримувану мову перекладу', async () => {
    const res = await request(app).post('/test').send({
      word_text: 'Haus',
      sentence_text: 'Das Haus ist groß.',
      translations: { zz: { word_translation: 'x', sentence_translation: 'y' } },
    });
    expect(res.status).toBe(400);
  });

  it('відхиляє порожнє слово', async () => {
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

  it('приймає масив із двома мовами перекладу', async () => {
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

  it('відхиляє слово без перекладів у масиві', async () => {
    const res = await request(app).post('/test').send({
      words: [{ word_text: 'Haus', sentence_text: 'a', translations: {} }],
    });
    expect(res.status).toBe(400);
  });

  it('відхиляє порожній масив', async () => {
    const res = await request(app).post('/test').send({ words: [] });
    expect(res.status).toBe(400);
  });
});
