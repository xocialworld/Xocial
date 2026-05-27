export type EntitlementUser = {
  id?: string | null;
  email?: string | null;
};

const PLAN_PRIORITY: Record<string, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  enterprise: 3,
};

function parseEnvList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

function normalizePlan(plan: string | null | undefined): string {
  return String(plan || 'free').trim();
}

export function rankPlan(plan?: string | null): number {
  return PLAN_PRIORITY[normalizePlan(plan)] ?? 0;
}

export function pickHighestPlan(plans: Array<string | null | undefined>): string {
  let best = 'free';

  plans.forEach((plan) => {
    if (rankPlan(plan) > rankPlan(best)) {
      best = normalizePlan(plan);
    }
  });

  return best;
}

export function getConfiguredDevAdminPlan(
  user: EntitlementUser | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const userEmail = normalizeEmail(user?.email);
  const userId = String(user?.id || '').trim();

  const configuredEmails = parseEnvList(env.XOCIAL_DEV_ADMIN_EMAILS).map(normalizeEmail);
  const configuredUserIds = [
    ...parseEnvList(env.XOCIAL_DEV_ADMIN_USER_IDS),
    ...parseEnvList(env.XOCIAL_TEST_SUBSCRIPTION_USER_IDS),
  ];

  const emailMatches = !!userEmail && configuredEmails.includes(userEmail);
  const idMatches = !!userId && configuredUserIds.includes(userId);

  if (!emailMatches && !idMatches) {
    return null;
  }

  return normalizePlan(env.XOCIAL_DEV_ADMIN_PLAN || env.XOCIAL_TEST_SUBSCRIPTION_PLAN || 'enterprise');
}

export function applyDevAdminPlanOverride(
  currentPlan: string | null | undefined,
  user: EntitlementUser | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {
  const configuredPlan = getConfiguredDevAdminPlan(user, env);
  return pickHighestPlan([currentPlan || 'free', configuredPlan]);
}

export function isDevAdminUser(
  user: EntitlementUser | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return !!getConfiguredDevAdminPlan(user, env);
}
