const request = require('supertest');
const app = require('../index'); 
const sequelize = require('../db'); // Імпортуйте ваше з'єднання

describe('Auth API Documentation Samples', () => {
  
  // Перед тестами чекаємо синхронізації БД
  beforeAll(async () => {
    await sequelize.sync();
  });

  // ПІСЛЯ тестів закриваємо з'єднання, щоб Jest міг вийти
  afterAll(async () => {
    await sequelize.close();
  });

  it('SHOULD register a new user', async () => {
    const password = 'GoodPassword123!'; // Винесемо в змінну для зручності
    
    const newUser = {
      username: `user_${Date.now()}`,
      password: password,
      confirm_password: password // Додаємо обов'язкове поле підтвердження
    };

    const response = await request(app)
      .post('/auth/register') 
      .send(newUser);

    // Тепер валідація має пройти
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('token');
  });
});



