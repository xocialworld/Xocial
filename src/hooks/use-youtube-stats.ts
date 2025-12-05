import { useState, useEffect, useCallback } from 'react';
import { YouTubeChannelStats } from '@/lib/youtube-sync';

interface UseYouTubeStatsReturn {
    stats: YouTubeChannelStats | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage YouTube channel statistics
 * Auto-refreshes every 5 minutes
 */
export function useYouTubeStats(accountId: string): UseYouTubeStatsReturn {
    const [stats, setStats] = useState<YouTubeChannelStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = useCallback(async () => {
        if (!accountId) return;

        try {
            setLoading(true);
            setError(null);

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
            setStats(data);
        } catch (err) {
            console.error('[useYouTubeStats] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch YouTube stats'));
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        fetchStats();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refetch: fetchStats,
    };
}
