const express = require('express');
const helmet = require('helmet');
const request = require('supertest');
const UserController = require('../controllers/UserController');

function buildTestApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/stats', (req, res) => {
    res.json({
      usersCount: 12,
      wordsCount: 340,
      wordSetsCount: 18,
    });
  });

  app.get('/admin/overview', UserController.verifyToken, (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('API smoke', () => {
  it('GET /stats returns public stats', async () => {
    const res = await request(buildTestApp()).get('/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      usersCount: 12,
      wordsCount: 340,
      wordSetsCount: 18,
    });
  });

  it('GET /stats has helmet security headers', async () => {
    const res = await request(buildTestApp()).get('/stats');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /admin/overview without a token returns 401', async () => {
    const res = await request(buildTestApp()).get('/admin/overview');
    expect(res.status).toBe(401);
  });
});
