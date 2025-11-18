import { act } from '@testing-library/react';
import { useWorkspaceStore, WorkspaceSummary } from '../workspaceStore';

const demoWorkspaces: WorkspaceSummary[] = [
  { id: 'ws-1', name: 'Alpha Studio', slug: 'alpha', role: 'owner' },
  { id: 'ws-2', name: 'Beta Labs', slug: 'beta', role: 'admin' },
];

describe('workspaceStore', () => {
  beforeEach(() => {
    act(() => {
      useWorkspaceStore.getState().reset();
    });
  });

  it('selects the first workspace by default', () => {
    act(() => {
      useWorkspaceStore.getState().setWorkspaces(demoWorkspaces);
    });

    const selected = useWorkspaceStore.getState().selectedWorkspace;
    expect(selected?.id).toBe('ws-1');
  });

  it('preserves selection when workspace list updates', () => {
    act(() => {
      useWorkspaceStore.getState().setWorkspaces(demoWorkspaces);
      useWorkspaceStore.getState().selectWorkspace('ws-2');
    });

    act(() => {
      useWorkspaceStore
        .getState()
        .setWorkspaces([
          { id: 'ws-2', name: 'Beta Labs', slug: 'beta', role: 'admin' },
          { id: 'ws-3', name: 'Gamma Collective', slug: 'gamma', role: 'editor' },
        ]);
    });

    const selected = useWorkspaceStore.getState().selectedWorkspace;
    expect(selected?.id).toBe('ws-2');
  });

  it('falls back to first workspace when previous selection is missing', () => {
    act(() => {
      useWorkspaceStore.getState().setWorkspaces(demoWorkspaces);
      useWorkspaceStore.getState().selectWorkspace('ws-2');
    });

    act(() => {
      useWorkspaceStore
        .getState()
        .setWorkspaces([{ id: 'ws-4', name: 'Delta', slug: 'delta', role: 'viewer' }]);
    });

    const selected = useWorkspaceStore.getState().selectedWorkspace;
    expect(selected?.id).toBe('ws-4');
  });
});

