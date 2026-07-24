const {
  serverErrorMessage,
  respondServerError,
  respondAuthTokenError,
} = require('../utils/apiResponse');

describe('apiResponse', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('у production ховає деталі помилки', () => {
    process.env.NODE_ENV = 'production';
    expect(serverErrorMessage(new Error('sequelize timeout'))).toBe('Internal server error');
  });

  it('у development показує message', () => {
    process.env.NODE_ENV = 'development';
    expect(serverErrorMessage(new Error('debug info'))).toBe('debug info');
  });

  it('respondServerError повертає 500', () => {
    process.env.NODE_ENV = 'production';
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };

    respondServerError(res, 'Test', new Error('secret'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      source: 'Test',
      message: 'Internal server error',
    });
  });

  it('respondAuthTokenError повертає уніфіковане 401', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status };

    respondAuthTokenError(res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      source: 'Token verification error',
      message: 'Invalid or expired token',
    });
  });
});
