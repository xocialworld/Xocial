import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, UserProfile, WorkspaceMembership } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  workspaces: WorkspaceMembership[];
  activeWorkspaceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setWorkspaces: (workspaces: WorkspaceMembership[]) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  getActiveWorkspace: () => WorkspaceMembership | null;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  profile: null,
  workspaces: [],
  activeWorkspaceId: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setProfile: (profile) => {
        set({ profile });
      },

      setWorkspaces: (workspaces) => {
        const state = get();
        set({
          workspaces,
          // Set first workspace as active if none is set
          activeWorkspaceId:
            state.activeWorkspaceId ||
            (workspaces.length > 0 ? workspaces[0].workspace_id : null),
        });
      },

      setActiveWorkspace: (workspaceId) => {
        set({ activeWorkspaceId: workspaceId });
      },

      getActiveWorkspace: () => {
        const state = get();
        const activeWorkspace = state.workspaces.find(
          (w) => w.workspace_id === state.activeWorkspaceId
        ) || null;
        return activeWorkspace;
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'xocial-auth',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);
