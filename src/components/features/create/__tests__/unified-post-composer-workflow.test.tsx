const mockRouterPush = jest.fn();
const mockInvalidateAllPostQueries = jest.fn();
const mockGetSession = jest.fn();
const accountsState: any = {
  accounts: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/use-accounts', () => ({
  useAccounts: () => accountsState,
}));

jest.mock('@/store/workspaceStore', () => ({
  useSelectedWorkspace: () => ({
    id: 'ws-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    role: 'owner',
  }),
}));

jest.mock('@/lib/react-query', () => ({
  invalidateAllPostQueries: (...args: any[]) => mockInvalidateAllPostQueries(...args),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedPostComposer } from '../unified-post-composer';

function renderComposer() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UnifiedPostComposer />
    </QueryClientProvider>
  );
}

describe('UnifiedPostComposer workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    accountsState.accounts = [];
    accountsState.loading = false;
    accountsState.error = null;
    accountsState.refetch = jest.fn();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-access-token',
        },
      },
    });
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses AI generation to replace the base content box', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          generationId: '00000000-0000-4000-8000-000000000001',
          model: 'openai/gpt-4o-mini',
          platformContent: {
            facebook: { text: 'Generated base post for Facebook' },
          },
        },
      }),
    });

    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: /Facebook/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /Content box/i }), {
      target: { value: 'Write a post about a creator scheduling product.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /Content box/i })).toHaveValue(
        'Generated base post for Facebook'
      );
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/generate?workspaceId=ws-1'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('creates editable previews directly from pasted content and saves only checked previews as draft', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { post: { id: 'post-1', status: 'draft' } } }),
    });

    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: /Facebook/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /Content box/i }), {
      target: { value: 'Launch post for agencies managing multi-channel creators.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use pasted content/i }));

    await screen.findByText('Platform previews');
    expect(screen.getByRole('checkbox', { name: /Include Facebook preview/i })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const postCall = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(postCall[1].body);

    expect(postCall[0]).toContain('/api/posts?workspaceId=ws-1');
    expect(payload.status).toBe('draft');
    expect(payload.platforms).toEqual(['facebook']);
    expect(payload.content.facebook.text).toBe(
      'Launch post for agencies managing multi-channel creators.'
    );
    expect(payload.platformAccounts).toBeUndefined();
    expect(payload.ai_generated).toBe(false);
    expect(payload.ai_prompt).toBeUndefined();
    expect(payload.ai_metadata).toBeUndefined();
  });

  it('creates editable fallback previews when preview AI fails and saves only checked previews as draft', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'AI unavailable' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { post: { id: 'post-1', status: 'draft' } } }),
      });

    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: /Facebook/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /Content box/i }), {
      target: { value: 'Launch post for agencies managing multi-channel creators.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create with AI/i }));

    await screen.findByText('Platform previews');
    expect(screen.getByRole('checkbox', { name: /Include Facebook preview/i })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    const aiCall = (global.fetch as jest.Mock).mock.calls[0];
    const aiPayload = JSON.parse(aiCall[1].body);
    const postCall = (global.fetch as jest.Mock).mock.calls[1];
    const payload = JSON.parse(postCall[1].body);

    expect(aiCall[0]).toContain('/api/ai/generate?workspaceId=ws-1');
    expect(aiPayload).toMatchObject({
      prompt: 'Launch post for agencies managing multi-channel creators.',
      platforms: ['facebook'],
      addHashtags: true,
      addCTA: true,
    });
    expect(postCall[0]).toContain('/api/posts?workspaceId=ws-1');
    expect(payload.status).toBe('draft');
    expect(payload.platforms).toEqual(['facebook']);
    expect(payload.content.facebook.text).toBe(
      'Launch post for agencies managing multi-channel creators.'
    );
    expect(payload.platformAccounts).toBeUndefined();
  });

  it('blocks publish actions for checked previews without selected accounts', async () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: /Facebook/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /Content box/i }), {
      target: { value: 'Launch post for agencies managing multi-channel creators.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use pasted content/i }));

    await screen.findByText('Platform previews');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Publish$/i })).toBeDisabled();
    expect(screen.getByText(/Connect or select accounts for: Facebook/i)).toBeInTheDocument();
    expect(screen.getByText(/Drafts allowed. Select an account before publishing/i)).toBeInTheDocument();
  });

  it('uploads selected media with workspace and bearer auth context', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'media-1',
        url: 'https://example.com/media.png',
        type: 'image',
        name: 'media.png',
        size: 68,
      }),
    });

    const { container } = renderComposer();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'media.png', { type: 'image/png' });

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];

    expect(url).toContain('/api/media/upload?workspaceId=ws-1');
    expect(options.credentials).toBe('include');
    expect(options.headers).toMatchObject({
      'x-workspace-id': 'ws-1',
      Authorization: 'Bearer test-access-token',
    });
  });
});
