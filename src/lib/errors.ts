/**
 * Error helpers: retry with backoff and a simple circuit breaker
 */

export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 8000,
    backoffMultiplier = 2,
  } = options;

  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailure?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private threshold: number = 5, private timeoutMs: number = 60000) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (this.lastFailure && now - this.lastFailure > this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures += 1;
      this.lastFailure = now;
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

export const apiCircuitBreaker = new CircuitBreaker();


