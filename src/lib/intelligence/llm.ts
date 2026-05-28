import { generateText } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';
import { env } from '@/lib/env';
import {
  createXocialOpenAIProvider,
  resolveOpenAICompatibleModelId,
} from '@/lib/ai/gateway';
import { recordAIModelRun } from './learning';

const { openai, usesGateway } = createXocialOpenAIProvider();

function getProviderOrder() {
  return (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
    .split(',')
    .map((provider) => provider.trim())
    .filter(Boolean);
}

function resolveModelId(id: string) {
  return resolveOpenAICompatibleModelId(id, usesGateway);
}

function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = trimmed.indexOf('{');

  if (start === -1) {
    throw new Error('AI worker returned text without a JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(trimmed.slice(start, index + 1));
      }
    }
  }

  throw new Error('AI worker returned incomplete JSON.');
}

function tokenUsageFromResult(result: Awaited<ReturnType<typeof generateText>>) {
  const usage = (result as any).usage || {};
  return Number(usage.totalTokens || usage.total_tokens || usage.completionTokens || 0);
}

export async function generateWorkerJson<T>(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    taskId?: string | null;
    agentType: string;
    promptVersion: string;
    system: string;
    user: string;
    schema: z.ZodType<T>;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    entityType?: string | null;
    entityId?: string | null;
    inputPayload?: Record<string, unknown>;
  }
): Promise<{
  data: T;
  model: string;
  modelRunId?: string;
  tokenUsage: number;
}> {
  const startedAt = Date.now();
  const model = resolveModelId(input.model || DEFAULT_AI_MODEL);
  const inputPayload = {
    ...(input.inputPayload || {}),
    taskId: input.taskId || null,
    agentType: input.agentType,
    promptVersion: input.promptVersion,
  };

  try {
    const result = await generateText({
      model: openai(model),
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      maxTokens: input.maxTokens || 1400,
      temperature: input.temperature ?? 0.35,
      providerOptions: {
        gateway: {
          order: getProviderOrder().length ? getProviderOrder() : ['openai'],
        },
        openai: {
          responseFormat: { type: 'json_object' },
        },
      },
    });

    const data = input.schema.parse(extractJsonObject(result.text || ''));
    const tokenUsage = tokenUsageFromResult(result);
    const modelRun = await recordAIModelRun(supabase, {
      workspaceId: input.workspaceId,
      feature: `agent:${input.agentType}`,
      promptVersion: input.promptVersion,
      model,
      inputPayload,
      outputPayload: data as Record<string, unknown>,
      status: 'succeeded',
      tokenUsage,
      latencyMs: Date.now() - startedAt,
      entityType: input.entityType || 'agent_task',
      entityId: input.entityId || input.taskId || null,
    });

    if (input.taskId && modelRun?.id) {
      await supabase
        .from('agent_tasks')
        .update({ model_run_id: modelRun.id, updated_at: new Date().toISOString() })
        .eq('id', input.taskId);
    }

    return {
      data,
      model,
      modelRunId: modelRun?.id,
      tokenUsage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI worker generation failed';
    await recordAIModelRun(supabase, {
      workspaceId: input.workspaceId,
      feature: `agent:${input.agentType}`,
      promptVersion: input.promptVersion,
      model,
      inputPayload,
      outputPayload: {},
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      entityType: input.entityType || 'agent_task',
      entityId: input.entityId || input.taskId || null,
      errorMessage: message,
    });
    throw error;
  }
}
