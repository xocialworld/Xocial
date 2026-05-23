jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (model: string) => ({ model })),
}));

jest.mock('@/lib/env', () => ({
  env: {
    VERCEL_AI_GATEWAY_API_KEY: 'test-gateway-key',
    VERCEL_AI_GATEWAY_URL: 'https://ai-gateway.vercel.sh',
    VERCEL_AI_GATEWAY_ORDER: 'openai',
    DEMO_PUBLISH: 'false',
  },
}));

import { generateObject, generateText } from 'ai';
import { generateContent } from '../index';

const mockedGenerateText = generateText as jest.Mock;
const mockedGenerateObject = generateObject as jest.Mock;

describe('generateContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses model JSON text into the existing platformContent response shape', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        platform_content: {
          facebook: {
            text: 'Generated Facebook post',
            hashtags: ['launch', 'creators'],
            call_to_action: 'Try it today',
          },
        },
        hashtags: ['shared'],
        summary: {
          tone: 'professional',
          highlights: ['CTA: Try it today'],
        },
      }),
      usage: { totalTokens: 123 },
    });

    const result = await generateContent({
      prompt: 'Write a launch post for a creator scheduling tool.',
      platforms: ['facebook'],
      tone: 'professional',
      length: 'short',
    });

    expect(mockedGenerateObject).not.toHaveBeenCalled();
    expect(result.platformContent.facebook?.text).toBe('Generated Facebook post');
    expect(result.platformContent.facebook?.hashtags).toEqual(['launch', 'creators']);
    expect(result.hashtags).toEqual(['shared', 'launch', 'creators']);
    expect(result.model).toBe('openai/gpt-4o-mini');
    expect(result.tokenUsage).toBe(123);
  });

  it('retries once when the first JSON response is invalid', async () => {
    mockedGenerateText
      .mockResolvedValueOnce({
        text: 'not json',
        usage: { totalTokens: 10 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          platform_content: {
            linkedin: {
              text: 'Generated LinkedIn post',
            },
          },
        }),
        usage: { totalTokens: 42 },
      });

    const result = await generateContent({
      prompt: 'Write a LinkedIn post for a creator scheduling tool.',
      platforms: ['linkedin'],
      tone: 'professional',
      length: 'short',
    });

    expect(mockedGenerateText).toHaveBeenCalledTimes(2);
    expect(result.platformContent.linkedin?.text).toBe('Generated LinkedIn post');
  });
});
