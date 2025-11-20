import { create } from 'zustand';
import type { SocialAccount, Post } from '@/types';

interface AccountsState {
    accounts: SocialAccount[];
    selectedAccount: SocialAccount | null;
    filterPlatform: string[];
    filterStatus: string[];
    isPostsDrawerOpen: boolean;
    isCommentsOpen: boolean;
    selectedPost: Post | null;

    // Actions
    setAccounts: (accounts: SocialAccount[]) => void;
    setFilterPlatform: (platforms: string[]) => void;
    setFilterStatus: (statuses: string[]) => void;
    openPostsDrawer: (account: SocialAccount) => void;
    closePostsDrawer: () => void;
    openComments: (post: Post) => void;
    closeComments: () => void;
    resetFilters: () => void;
}

export const useAccountsStore = create<AccountsState>((set) => ({
    accounts: [],
    selectedAccount: null,
    filterPlatform: [],
    filterStatus: ['active'],
    isPostsDrawerOpen: false,
    isCommentsOpen: false,
    selectedPost: null,

    setAccounts: (accounts) => set({ accounts }),

    setFilterPlatform: (platforms) => set({ filterPlatform: platforms }),

    setFilterStatus: (statuses) => set({ filterStatus: statuses }),

    openPostsDrawer: (account) =>
        set({
            selectedAccount: account,
            isPostsDrawerOpen: true,
        }),

    closePostsDrawer: () =>
        set({
            isPostsDrawerOpen: false,
            selectedAccount: null,
            isCommentsOpen: false,
            selectedPost: null,
        }),

    openComments: (post) =>
        set({
            selectedPost: post,
            isCommentsOpen: true,
        }),

    closeComments: () =>
        set({
            isCommentsOpen: false,
            selectedPost: null,
        }),

    resetFilters: () =>
        set({
            filterPlatform: [],
            filterStatus: ['active'],
        }),
}));
