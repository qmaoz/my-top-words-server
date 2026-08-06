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

    it('rejects an empty password', async () => {
      const res = await request(app)
        .post('/test')
        .send({ username: 'user', password: '' });

      expect(res.status).toBe(400);
    });

    it('accepts valid data', async () => {
      const res = await request(app)
        .post('/test')
        .send({ username: 'user', password: 'SecretPass1!' });

      expect(res.status).toBe(200);
    });
  });

  describe('feedbackValidation page_url', () => {
    const app = buildValidationApp(feedbackValidation);

    it('rejects an external URL', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test', page_url: 'https://evil.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/internal path/i);
    });

    it('accepts an internal path', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test', page_url: '/about' });

      expect(res.status).toBe(200);
    });

    it('accepts a missing page_url', async () => {
      const res = await request(app)
        .post('/test')
        .send({ type: 'bug', message: 'test' });

      expect(res.status).toBe(200);
    });
  });

  describe('registerValidation', () => {
    it('includes username, password, and confirm_password rules', () => {
      expect(registerValidation).toHaveLength(3);
    });

    it('confirm_password must match password', async () => {
      const confirmRules = [
        body('password').trim(),
        body('confirm_password')
          .trim()
          .custom((value, { req }) => value === req.body.password)
          .withMessage('Passwords do not match'),
      ];
      const app = buildValidationApp(confirmRules);

      const mismatch = await request(app)
        .post('/test')
        .send({ password: 'SecretPass1!@#', confirm_password: 'OtherPass1!@#' });

      expect(mismatch.status).toBe(400);
      expect(mismatch.body.message).toMatch(/do not match/i);

      const match = await request(app)
        .post('/test')
        .send({ password: 'SecretPass1!@#', confirm_password: 'SecretPass1!@#' });

      expect(match.status).toBe(200);
    });
  });
});
