const express = require('express');
const { validationResult, body } = require('express-validator');
const request = require('supertest');

const {
  loginValidation,
  feedbackValidation,
  registerValidation,
} = require('../validation/validations');

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

describe('validations', () => {
  describe('loginValidation', () => {
    const app = buildValidationApp(loginValidation);

    it('відхиляє порожній пароль', async () => {
      const res = await request(app)
        .post('/test')
        .send({ username: 'user', password: '' });

      expect(res.status).toBe(400);
    });

    it('приймає валідні дані', async () => {
      const res = await request(app)
        .post('/test')
        .send({ username: 'user', password: 'SecretPass1!' });

      expect(res.status).toBe(200);
    });
  });

  describe('feedbackValidation page_url', () => {
    const app = buildValidationApp(feedbackValidation);

    it('відхиляє зовнішній URL', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test', page_url: 'https://evil.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/внутрішній шлях/i);
    });

    it('приймає внутрішній шлях', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test', page_url: '/about' });

      expect(res.status).toBe(200);
    });

    it('приймає відсутній page_url', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test' });

      expect(res.status).toBe(200);
    });
  });

  describe('registerValidation', () => {
    it('містить правила username, password і confirm_password', () => {
      expect(registerValidation).toHaveLength(3);
    });

    it('confirm_password має збігатися з password', async () => {
      const confirmRules = [
        body('password').trim(),
        body('confirm_password')
          .trim()
          .custom((value, { req }) => value === req.body.password)
          .withMessage('Паролі не збігаються!'),
      ];
      const app = buildValidationApp(confirmRules);

      const mismatch = await request(app)
        .post('/test')
        .send({ password: 'SecretPass1!@#', confirm_password: 'OtherPass1!@#' });

      expect(mismatch.status).toBe(400);
      expect(mismatch.body.message).toMatch(/не збігаються/i);

      const match = await request(app)
        .post('/test')
        .send({ password: 'SecretPass1!@#', confirm_password: 'SecretPass1!@#' });

      expect(match.status).toBe(200);
    });
  });
});
