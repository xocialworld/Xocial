import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env';

export function getAIGatewayApiKey() {
  return (
    env.AI_GATEWAY_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL_OIDC_TOKEN ||
    env.VERCEL_AI_GATEWAY_API_KEY ||
    ''
  );
}

export function getAIGatewayBaseURL() {
  return env.VERCEL_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh';
}

export function hasAIGatewayAuth() {
  return Boolean(getAIGatewayApiKey());
}

export function createXocialOpenAIProvider() {
  const gatewayKey = getAIGatewayApiKey();
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
