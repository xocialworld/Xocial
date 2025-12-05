export type AIModelCategory = 'recommended' | 'premium' | 'standard' | 'coding';

export type AIModel = {
  id: string;
  label: string;
  provider: string;
  description: string;
  context: string;
  priceHint: string;
  category: AIModelCategory;
  isNew?: boolean;
};

// Using Vercel AI Gateway format: provider/model-name
export const AI_MODELS: AIModel[] = [
  // Recommended (Balance of Cost/Performance)
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Best balance of speed, cost, and quality for everyday tasks.',
    context: '128k context',
    priceHint: '$0.15/$0.60 per 1M tokens',
    category: 'recommended',
  },
  {
    id: 'google/gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'Google',
    description: 'Extremely fast and cost-effective with massive context window.',
    context: '1M context',
    priceHint: '$0.075/$0.30 per 1M tokens',
    category: 'recommended',
    isNew: true,
  },
  {
    id: 'anthropic/claude-3-haiku',
    label: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fastest Claude model, great for quick, human-like copy.',
    context: '200k context',
    priceHint: '$0.25/$1.25 per 1M tokens',
    category: 'recommended',
  },
  
  // Premium (High Intelligence)
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Flagship model with high reasoning capabilities.',
    context: '128k context',
    priceHint: '$2.50/$10.00 per 1M tokens',
    category: 'premium',
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Exceptional nuance, coding, and creative writing.',
    context: '200k context',
    priceHint: '$3.00/$15.00 per 1M tokens',
    category: 'premium',
    isNew: true,
  },
  {
    id: 'google/gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Best for complex analysis and long-context tasks.',
    context: '2M context',
    priceHint: '$3.50/$10.50 per 1M tokens',
    category: 'premium',
  },

  // Standard/Others
  {
    id: 'meta/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B',
    provider: 'Meta',
    description: 'Open source powerhouse, comparable to GPT-4.',
    context: '128k context',
    priceHint: '$0.90/$0.90 per 1M tokens',
    category: 'standard',
  },
  {
    id: 'mistral/mistral-large',
    label: 'Mistral Large 2',
    provider: 'Mistral',
    description: 'Top-tier reasoning and multilingual capabilities.',
    context: '32k context',
    priceHint: '$2.00/$6.00 per 1M tokens',
    category: 'standard',
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Highly efficient and capable model.',
    context: '32k context',
    priceHint: '$0.14/$0.28 per 1M tokens',
    category: 'standard',
  }
];

export const DEFAULT_AI_MODEL = 'openai/gpt-4o-mini';

// Helper to get just IDs for validation if needed, though we should prefer allowing string
export const KNOWN_MODEL_IDS = AI_MODELS.map(m => m.id);
