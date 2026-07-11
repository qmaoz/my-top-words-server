process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test_jwt_secret_key_with_32_chars_min';
process.env.DB_DIALECT = 'postgres';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
