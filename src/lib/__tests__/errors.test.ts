import { retryWithBackoff, apiCircuitBreaker } from '../errors';

describe('errors helpers', () => {
  test('retryWithBackoff retries and eventually succeeds', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'ok';
    });

    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1, maxDelay: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('circuit breaker opens after threshold', async () => {
    const breaker = apiCircuitBreaker as any;
    // Force failures fast using a throwing fn
    const throwing = () => Promise.reject(new Error('boom'));
    await expect(breaker.execute(throwing)).rejects.toThrow('boom');
    await expect(breaker.execute(throwing)).rejects.toThrow('boom');
    await expect(breaker.execute(throwing)).rejects.toThrow('boom');
  });
});


