import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  logo_url?: string | null;
};

interface WorkspaceState {
  workspaces: WorkspaceSummary[];
  selectedWorkspace?: WorkspaceSummary;
  setWorkspaces: (entries: WorkspaceSummary[]) => void;
  selectWorkspace: (workspaceId: string) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        workspaces: [],
        selectedWorkspace: undefined,
        setWorkspaces: (entries) =>
          set((state) => {
            if (entries.length === 0) {
              return { workspaces: [], selectedWorkspace: undefined };
            }

            const currentId = state.selectedWorkspace?.id;
            const nextSelected =
              entries.find((workspace) => workspace.id === currentId) ?? entries[0];

            return {
              workspaces: entries,
              selectedWorkspace: nextSelected,
            };
          }),
        selectWorkspace: (workspaceId) =>
          set((state) => {
            const match = state.workspaces.find((workspace) => workspace.id === workspaceId);
            if (!match) {
              return {};
            }
            return { selectedWorkspace: match };
          }),
        reset: () => set({ workspaces: [], selectedWorkspace: undefined }),
      }),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          workspaces: state.workspaces,
          selectedWorkspace: state.selectedWorkspace,
        }),
      }
    ),
    { name: 'WorkspaceStore' }
  )
);

export const useSelectedWorkspace = () =>
  useWorkspaceStore((state) => state.selectedWorkspace);

export const useWorkspaceList = () => useWorkspaceStore((state) => state.workspaces);

