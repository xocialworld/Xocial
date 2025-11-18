import { create } from 'zustand';
import type { Platform, PostStatus } from '@/types';

type CalendarFilterState = {
  platforms: Platform[];
  statuses: PostStatus[];
  togglePlatform: (platform: Platform) => void;
  toggleStatus: (status: PostStatus) => void;
  reset: () => void;
};

const ALL_STATUSES: PostStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'published',
  'failed',
];

export const useCalendarFiltersStore = create<CalendarFilterState>((set) => ({
  platforms: [],
  statuses: [],
  togglePlatform: (platform) =>
    set((state) => {
      const exists = state.platforms.includes(platform);
      return {
        platforms: exists
          ? state.platforms.filter((p) => p !== platform)
          : [...state.platforms, platform],
      };
    }),
  toggleStatus: (status) =>
    set((state) => {
      const exists = state.statuses.includes(status);
      return {
        statuses: exists
          ? state.statuses.filter((s) => s !== status)
          : [...state.statuses, status],
      };
    }),
  reset: () => set({ platforms: [], statuses: [] }),
}));

export const platformOptions: Platform[] = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];
export const statusOptions = ALL_STATUSES;

