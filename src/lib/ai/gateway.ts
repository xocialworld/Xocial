import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env';

const VERCEL_OIDC_HEADER = 'x-vercel-oidc-token';

function cleanAuthToken(value?: string | null) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

export function getAIGatewayRequestToken(
  request?: { headers?: { get(name: string): string | null } } | null
) {
  return cleanAuthToken(request?.headers?.get(VERCEL_OIDC_HEADER)) || undefined;
}

export function getAIGatewayApiKey(requestOidcToken?: string | null) {
  return (
    cleanAuthToken(env.AI_GATEWAY_API_KEY) ||
    cleanAuthToken(process.env.AI_GATEWAY_API_KEY) ||
    cleanAuthToken(requestOidcToken) ||
    cleanAuthToken(env.VERCEL_OIDC_TOKEN) ||
    cleanAuthToken(process.env.VERCEL_OIDC_TOKEN) ||
    ''
  );
}

export function getAIGatewayBaseURL() {
  return env.VERCEL_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh';
}

export function hasAIGatewayAuth(requestOidcToken?: string | null) {
  return Boolean(getAIGatewayApiKey(requestOidcToken));
}

export function createXocialOpenAIProvider(requestOidcToken?: string | null) {
  const gatewayKey = getAIGatewayApiKey(requestOidcToken);
  const usesGateway = Boolean(gatewayKey);

  return {
    openai: createOpenAI({
      apiKey: usesGateway ? gatewayKey : env.OPENAI_API_KEY,
      baseURL: usesGateway ? `${getAIGatewayBaseURL()}/v1` : undefined,
    }),
    usesGateway,
  };
}

export function resolveOpenAICompatibleModelId(id: string, usesGateway: boolean) {
  if (usesGateway) {
    return id.includes('/') ? id : `openai/${id}`;
  }

  if (!id.startsWith('openai/')) {
    console.warn(`[AI] Direct OpenAI configured. Falling back from ${id} to gpt-4o-mini`);
    return 'gpt-4o-mini';
  }

  return id.replace('openai/', '');
}
