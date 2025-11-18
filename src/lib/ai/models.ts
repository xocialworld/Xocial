export type AIModel = {
  id: string;
  label: string;
  description: string;
  context: string;
  priceHint: string;
};

export const AI_MODEL_IDS = ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o'] as const;

export const AI_MODELS: AIModel[] = [
  {
    id: AI_MODEL_IDS[0],
    label: 'GPT-3.5 Turbo',
    description: 'Most cost-effective option; great for drafts, hashtags, and quick iterations.',
    context: 'Up to 16K tokens, excellent for day-to-day social copy.',
    priceHint: '≈$0.50 / 1M input, $1.50 / 1M output tokens',
  },
  {
    id: AI_MODEL_IDS[1],
    label: 'GPT-4o Mini',
    description: 'Fast, low-latency model ideal for most creative + scheduling tasks.',
    context: 'Up to 128K tokens, refreshed October 2023 knowledge.',
    priceHint: '≈$0.15 / 1M input, $0.60 / 1M output tokens',
  },
  {
    id: AI_MODEL_IDS[2],
    label: 'GPT-4o',
    description: 'Best quality + reasoning for complex briefs or regulated brands.',
    context: 'State-of-the-art instruction following and creative writing.',
    priceHint: '≈$2.50 / 1M input, $10 / 1M output tokens',
  },
];

export const DEFAULT_AI_MODEL = AI_MODELS[1].id; // gpt-4o-mini - best balance of cost and performance

