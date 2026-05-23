// Mock useAccounts hook to avoid Supabase dependency in tests
const state: any = {
  accounts: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
};
const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/use-accounts', () => ({
  useAccounts: () => state,
  __setAccounts: (a: any[]) => (state.accounts = a),
  __setLoading: (l: boolean) => (state.loading = l),
  __setError: (e: string | null) => (state.error = e),
  __getRefetch: () => state.refetch,
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedPostComposer } from '../unified-post-composer';

// Mock fetch used by useAccounts hook
const mockAccountsPayload = (accounts: any[]) => ({
  success: true,
  data: { accounts },
});

describe('UnifiedPostComposer connection status', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    state.accounts = [];
    state.loading = false;
    state.error = null;
    state.refetch = jest.fn();
    (global as any).fetch = jest.fn();
  });

  function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  }

  it('shows ready-to-publish when selected platform has an online account', async () => {
    const accountsModule: any = require('@/hooks/use-accounts');
    accountsModule.__setAccounts([
      {
        id: 'acc-ig-1',
        workspace_id: 'ws-1',
        platform: 'instagram',
        account_id: 'ig-1',
        account_name: 'IG Account',
        access_token: 'token',
        connected_at: new Date().toISOString(),
        is_active: true,
      },
    ]);

    renderWithProviders(<UnifiedPostComposer />);

    await waitFor(() => expect(screen.getByText(/Platforms and accounts/i)).toBeInTheDocument());

    // Select Instagram in PlatformSelector
    const igButton = await screen.findByRole('button', { name: /Instagram/i });
    fireEvent.click(igButton);

    await waitFor(() => expect(screen.getAllByText(/IG Account/i).length).toBeGreaterThan(0));
  });

  it('indicates offline when selected platform has only offline accounts', async () => {
    const accountsModule: any = require('@/hooks/use-accounts');
    accountsModule.__setAccounts([
      {
        id: 'acc-li-1',
        workspace_id: 'ws-1',
        platform: 'linkedin',
        account_id: 'li-1',
        account_name: 'LinkedIn Account',
        access_token: 'token',
        connected_at: new Date().toISOString(),
        is_active: false,
        token_expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);

    renderWithProviders(<UnifiedPostComposer />);
    await waitFor(() => expect(screen.getByText(/Platforms and accounts/i)).toBeInTheDocument());

    const liButton = await screen.findByRole('button', { name: /LinkedIn/i });
    fireEvent.click(liButton);

    await waitFor(() => {
      const accountSelect = screen.getByRole('combobox', { name: /LinkedIn account/i });
      expect(accountSelect).toHaveValue('acc-li-1');
    });
  });

  it('refreshes connection status on Refresh accounts click', async () => {
    renderWithProviders(<UnifiedPostComposer />);
    const accountsModule: any = require('@/hooks/use-accounts');
    const syncButton = await screen.findByRole('button', { name: /Refresh accounts/i });
    fireEvent.click(syncButton);
    await waitFor(() => expect(accountsModule.__getRefetch()).toHaveBeenCalled());
  });
});
