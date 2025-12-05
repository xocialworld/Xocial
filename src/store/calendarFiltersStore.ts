import { create } from 'zustand';
import { Platform } from '@/types';

export const platformOptions: Platform[] = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];
export const statusOptions = ['draft', 'scheduled', 'published', 'failed'] as const;

export type Status = typeof statusOptions[number];

interface CalendarFiltersState {
  platforms: Platform[];
  statuses: Status[];
  togglePlatform: (platform: Platform) => void;
  toggleStatus: (status: Status) => void;
  reset: () => void;
}

export const useCalendarFiltersStore = create<CalendarFiltersState>((set) => ({
  platforms: [],
  statuses: [],
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
  reset: () => set({ platforms: [], statuses: [] }),
}));
