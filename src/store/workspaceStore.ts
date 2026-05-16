import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  logo_url?: string | null;
};

export type WorkspaceSwitchTransition = {
  target: WorkspaceSummary;
  startedAt: number;
};

interface WorkspaceState {
  workspaces: WorkspaceSummary[];
  selectedWorkspace?: WorkspaceSummary;
  workspaceSwitchTransition: WorkspaceSwitchTransition | null;
  setWorkspaces: (entries: WorkspaceSummary[]) => void;
  selectWorkspace: (workspaceId: string) => void;
  completeWorkspaceSwitch: (startedAt: number) => void;
  reset: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  lastFetchedAt: number | null;
  touchLastFetched: () => void;
  invalidateWorkspaces: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        workspaces: [],
        selectedWorkspace: undefined,
        workspaceSwitchTransition: null,
        _hasHydrated: false,
        lastFetchedAt: null,
        setHasHydrated: (state) => set({ _hasHydrated: state }),
        touchLastFetched: () => set({ lastFetchedAt: Date.now() }),
        invalidateWorkspaces: () => set({ lastFetchedAt: null }),
        setWorkspaces: (entries) =>
          set((state) => {
            if (entries.length === 0) {
              // Only clear if explicitly empty, but maybe we should keep selected if it's still valid logic?
              // No, if list is empty, selected must be undefined.
              return {
                workspaces: [],
                selectedWorkspace: undefined,
                workspaceSwitchTransition: null,
                lastFetchedAt: Date.now(),
              };
            }

            const currentId = state.selectedWorkspace?.id;
            const nextSelected =
              entries.find((workspace) => workspace.id === currentId) ?? entries[0];

            return {
              workspaces: entries,
              selectedWorkspace: nextSelected,
              lastFetchedAt: Date.now(),
            };
          }),
        selectWorkspace: (workspaceId) =>
          set((state) => {
            const match = state.workspaces.find((workspace) => workspace.id === workspaceId);
            if (!match) {
              return {};
            }
            if (state.selectedWorkspace?.id === match.id) {
              return {};
            }

            return {
              selectedWorkspace: match,
              workspaceSwitchTransition: {
                target: match,
                startedAt: Date.now(),
              },
            };
          }),
        completeWorkspaceSwitch: (startedAt) =>
          set((state) => {
            if (state.workspaceSwitchTransition?.startedAt !== startedAt) {
              return {};
            }

            return { workspaceSwitchTransition: null };
          }),
        reset: () =>
          set({
            workspaces: [],
            selectedWorkspace: undefined,
            workspaceSwitchTransition: null,
            lastFetchedAt: null,
          }),
      }),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          workspaces: state.workspaces,
          selectedWorkspace: state.selectedWorkspace,
          lastFetchedAt: state.lastFetchedAt,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    ),
    { name: 'WorkspaceStore' }
  )
);

export const useSelectedWorkspace = () =>
  useWorkspaceStore((state) => state.selectedWorkspace);

export const useWorkspaceList = () => useWorkspaceStore((state) => state.workspaces);

export const useHasHydrated = () => useWorkspaceStore((state) => state._hasHydrated);

export const useWorkspaceSwitchTransition = () =>
  useWorkspaceStore((state) => state.workspaceSwitchTransition);
