import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed';

interface UIState {
  theme: Theme;
  sidebarState: SidebarState;
  isMobileMenuOpen: boolean;
  activeModal: string | null;
  modalData: any;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarState: (state: SidebarState) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  reset: () => void;
}

const initialState = {
  theme: 'light' as Theme,
  sidebarState: 'expanded' as SidebarState,
  isMobileMenuOpen: false,
  activeModal: null,
  modalData: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      toggleSidebar: () =>
        set((state) => ({
          sidebarState: state.sidebarState === 'expanded' ? 'collapsed' : 'expanded',
        })),

      setSidebarState: (state) =>
        set({ sidebarState: state }),

      toggleMobileMenu: () =>
        set((state) => ({
          isMobileMenuOpen: !state.isMobileMenuOpen,
        })),

      setMobileMenuOpen: (open) =>
        set({ isMobileMenuOpen: open }),

      openModal: (modalId, data) =>
        set({
          activeModal: modalId,
          modalData: data,
        }),

      closeModal: () =>
        set({
          activeModal: null,
          modalData: null,
        }),

      reset: () =>
        set(initialState),
    }),
    {
      name: 'xocial-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarState: state.sidebarState,
      }),
    }
  )
);

