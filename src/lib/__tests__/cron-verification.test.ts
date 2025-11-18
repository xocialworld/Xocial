import { verifyCronRequest } from '../../lib/cron-verification';

describe('cron verification', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, CRON_SECRET: 'secret123' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('rejects when header missing', () => {
    const req = { headers: new Map() } as any;
    expect(verifyCronRequest(req)).toBe(false);
  });

  test('accepts when correct bearer token provided', () => {
    const req = {
      headers: {
        get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer secret123' : null),
      },
    } as any;
    expect(verifyCronRequest(req)).toBe(true);
  });
});


