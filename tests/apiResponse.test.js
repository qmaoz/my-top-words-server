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

  it('hides error details in production', () => {
    process.env.NODE_ENV = 'production';
    expect(serverErrorMessage(new Error('sequelize timeout'))).toBe('Internal server error');
  });

  it('shows message in development', () => {
    process.env.NODE_ENV = 'development';
    expect(serverErrorMessage(new Error('debug info'))).toBe('debug info');
  });

  it('respondServerError returns 500', () => {
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

  it('respondAuthTokenError returns a unified 401', () => {
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
