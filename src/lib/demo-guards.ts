import { env } from '@/lib/env';

export function isDemoPublishEnabled() {
  return process.env.DEMO_PUBLISH === 'true' || env.DEMO_PUBLISH === 'true';
}

export function assertDemoPublishAllowed() {
  if (isDemoPublishEnabled() && process.env.NODE_ENV === 'production') {
    throw new Error('Demo publish mode is not allowed in production.');
  }
}
