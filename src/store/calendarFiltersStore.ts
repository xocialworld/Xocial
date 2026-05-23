import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from '@/types';

export const platformOptions: Platform[] = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];
export const statusOptions = ['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'partial', 'failed', 'rejected'] as const;

export type Status = typeof statusOptions[number];

interface CalendarFiltersState {
  platforms: Platform[];
  statuses: Status[];
  togglePlatform: (platform: Platform) => void;
  toggleStatus: (status: Status) => void;
  reset: () => void;
}

export const useCalendarFiltersStore = create<CalendarFiltersState>()(
  persist(
    (set) => ({
      platforms: [...platformOptions], // Default to all selected
      statuses: [], // Default to all (empty usually means all in logic, but user specific "platforms" to be selected)
      togglePlatform: (platform) =>
        set((state) => ({
          platforms: state.platforms.includes(platform)
            ? state.platforms.filter((p) => p !== platform)
            : [...state.platforms, platform],
        })),
      toggleStatus: (status) =>
        set((state) => ({
          statuses: state.statuses.includes(status)
            ? state.statuses.filter((s) => s !== status)
            : [...state.statuses, status],
        })),
      reset: () => set({ platforms: [...platformOptions], statuses: [] }),
    }),
    {
      name: 'calendar-filters-storage',
      skipHydration: true,
    }
  )
);
