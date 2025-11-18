/**
 * Jest Setup File
 * Runs before each test file
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// ═══════════════════════════════════════════════════════════════
// MOCK ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CRON_SECRET = 'test-cron-secret-32-characters-long';

global.TransformStream = require('stream/web').TransformStream;
global.Request = function () {};
global.Response = function () {};

// ═══════════════════════════════════════════════════════════════
// MOCK NEXT.JS ROUTER
// ═══════════════════════════════════════════════════════════════

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// ═══════════════════════════════════════════════════════════════
// MOCK SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() =>
      Promise.resolve({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
        error: null,
      })
    ),
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      })
    ),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

// ═══════════════════════════════════════════════════════════════
// MOCK FETCH
// ═══════════════════════════════════════════════════════════════

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
  })
);

// ═══════════════════════════════════════════════════════════════
// MOCK WINDOW OBJECTS
// ═══════════════════════════════════════════════════════════════

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
    unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// ═══════════════════════════════════════════════════════════════
// CONSOLE SUPPRESSION (optional)
// ═══════════════════════════════════════════════════════════════

// Suppress console errors/warnings in tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only suppress React-specific warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = jest.fn((...args) => {
    // Suppress specific warnings
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

