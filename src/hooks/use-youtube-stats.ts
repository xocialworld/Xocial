import { useQuery } from '@tanstack/react-query';
import { YouTubeChannelStats } from '@/lib/youtube-sync';

interface UseYouTubeStatsReturn {
    stats: YouTubeChannelStats | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Hook to fetch and manage YouTube channel statistics
 * Auto-refreshes every 5 minutes
 */
export function useYouTubeStats(accountId: string): UseYouTubeStatsReturn {
    const {
        data: stats = null,
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['youtube-stats', accountId],
        queryFn: async () => {
            if (!accountId) return null;

            const response = await fetch('/api/accounts/youtube/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accountId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to sync YouTube stats');
            }

            const { data } = await response.json();
            return data as YouTubeChannelStats;
        },
        enabled: !!accountId,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000, // cache for 1 min
    });

    return {
        stats,
        loading,
        error: error as Error | null,
        refetch,
    };
}
