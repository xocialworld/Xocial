import { useState, useEffect, useCallback } from 'react';
import { StrategyRecommendation } from '@/types';
import { useWorkspace } from './use-workspace';
import { toast } from 'sonner';

export function useStrategy() {
    const { workspace } = useWorkspace();
    const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchRecommendations = useCallback(async () => {
        if (!workspace?.id) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/strategy/recommendations?workspaceId=${workspace.id}`);
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            const data = await res.json();
            setRecommendations(data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load strategy recommendations');
        } finally {
            setLoading(false);
        }
    }, [workspace?.id]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const generateStrategy = async () => {
        if (!workspace?.id) return;

        try {
            setGenerating(true);
            const res = await fetch('/api/strategy/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: workspace.id }),
            });

            if (!res.ok) throw new Error('Failed to generate strategy');

            const data = await res.json();
            setRecommendations(prev => [...(data.data || []), ...prev]);
            toast.success('New strategy recommendation generated');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate strategy');
        } finally {
            setGenerating(false);
        }
    };

    const performAction = async (id: string, action: 'implement' | 'dismiss') => {
        try {
            // Optimistic update
            setRecommendations(prev =>
                prev.map(rec =>
                    rec.id === id
                        ? { ...rec, status: action === 'implement' ? 'completed' : 'dismissed' }
                        : rec
                )
            );

            const res = await fetch(`/api/strategy/recommendations/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (!res.ok) {
                throw new Error('Failed to update recommendation');
                // Revert optimistic update if needed (omitted for brevity)
            }

            toast.success(action === 'implement' ? 'Recommendation marked as implemented' : 'Recommendation dismissed');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update recommendation');
            fetchRecommendations(); // Revert on error
        }
    };

    return {
        recommendations,
        loading,
        generating,
        generateStrategy,
        performAction,
        refresh: fetchRecommendations
    };
}
