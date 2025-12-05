import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { env } from '@/lib/env';
import { AI_MODELS } from '@/lib/ai/models';
import type { AIModel } from '@/lib/ai/models';
import type { NextResponse } from 'next/server';

function mapGatewayModel(m: any): AIModel | null {
  const id: string = m.id || '';
  const provider = (m.provider || (id.split('/')[0] || '')).trim();
  const label = m.name || id.split('/')[1] || id;
  const context = m.contextWindow ? `${m.contextWindow} context` : (m.context || '');
  const priceHint = m.pricing ? `${m.pricing.input ?? ''}/${m.pricing.output ?? ''} per 1M tokens` : (m.priceHint || '');
  const description = m.description || 'Gateway model';
  const category: AIModel['category'] = ['openai','anthropic','google'].includes(provider) ? 'recommended' : 'standard';
  if (!id || !provider) return null;
  return { id, label, provider: provider[0].toUpperCase()+provider.slice(1), description, context, priceHint, category };
}

export const GET = withErrorHandler(async (_req: NextRequest) => {
  const key = env.VERCEL_AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_API_KEY || '';
  const base = env.VERCEL_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh';
  const url = `${base}/v1/ai/models`;
  try {
    if (!key) throw new Error('missing');
    const res = await fetch(url, { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(String(res.status));
    const all = await res.json();
    const list = Array.isArray(all) ? all : Array.isArray(all?.models) ? all.models : [];
    const languageModels = list.filter((m: any) => (m.modelType || m.type) === 'language' || !m.modelType);
    const mapped = languageModels.map(mapGatewayModel).filter(Boolean) as AIModel[];
    const byProvider = mapped.reduce<Record<string, AIModel[]>>((acc, m) => {
      (acc[m.provider] ||= []).push(m);
      return acc;
    }, {});
    return successResponse({ providers: byProvider, models: mapped });
  } catch {
    const byProvider = AI_MODELS.reduce<Record<string, AIModel[]>>((acc, m) => { (acc[m.provider] ||= []).push(m); return acc; }, {});
    return successResponse({ providers: byProvider, models: AI_MODELS });
  }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
