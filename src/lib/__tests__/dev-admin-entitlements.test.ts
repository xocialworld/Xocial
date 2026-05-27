import {
  applyDevAdminPlanOverride,
  getConfiguredDevAdminPlan,
  isDevAdminUser,
  pickHighestPlan,
} from '@/lib/dev-admin-entitlements';

describe('dev admin entitlements', () => {
  const user = {
    id: 'user-123',
    email: 's.etup.xocial@gmail.com',
  };

  it('matches configured admin users by email case-insensitively', () => {
    const env = {
      XOCIAL_DEV_ADMIN_EMAILS: 'S.ETUP.XOCIAL@GMAIL.COM',
      XOCIAL_DEV_ADMIN_PLAN: 'enterprise',
    } as NodeJS.ProcessEnv;

    expect(getConfiguredDevAdminPlan(user, env)).toBe('enterprise');
    expect(applyDevAdminPlanOverride('free', user, env)).toBe('enterprise');
    expect(isDevAdminUser(user, env)).toBe(true);
  });

  it('matches configured admin users by id', () => {
    const env = {
      XOCIAL_DEV_ADMIN_USER_IDS: 'user-123',
      XOCIAL_DEV_ADMIN_PLAN: 'growth\n',
    } as NodeJS.ProcessEnv;

    expect(getConfiguredDevAdminPlan(user, env)).toBe('growth');
  });

  it('supports the legacy test subscription user id env', () => {
    const env = {
      XOCIAL_TEST_SUBSCRIPTION_USER_IDS: 'user-123',
      XOCIAL_TEST_SUBSCRIPTION_PLAN: 'enterprise',
    } as NodeJS.ProcessEnv;

    expect(getConfiguredDevAdminPlan(user, env)).toBe('enterprise');
  });

  it('keeps normal users on their real plan', () => {
    const env = {
      XOCIAL_DEV_ADMIN_EMAILS: 'admin@example.com',
      XOCIAL_DEV_ADMIN_PLAN: 'enterprise',
    } as NodeJS.ProcessEnv;

    expect(getConfiguredDevAdminPlan(user, env)).toBeNull();
    expect(applyDevAdminPlanOverride('free', user, env)).toBe('free');
  });

  it('never downgrades an existing higher plan', () => {
    const env = {
      XOCIAL_DEV_ADMIN_EMAILS: 's.etup.xocial@gmail.com',
      XOCIAL_DEV_ADMIN_PLAN: 'pro',
    } as NodeJS.ProcessEnv;

    expect(applyDevAdminPlanOverride('enterprise', user, env)).toBe('enterprise');
  });

  it('can pick the highest plan from mixed inputs', () => {
    expect(pickHighestPlan(['free', null, 'growth\n', 'pro'])).toBe('growth');
  });
});
