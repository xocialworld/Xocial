'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeedbackControls, WhyExplanation } from '@/components/features/intelligence';
import type { AIFeedbackTargetType, AIExplanation } from '@/types/intelligence';

const performanceExplanation: AIExplanation = {
    reasonSummary:
        'Xocial compares recent engagement, post formats, and platform outcome summaries to turn analytics into next actions.',
    evidence: [
        'Recent Instagram engagement is trending up in the analytics overview.',
        'Video formats are being treated as the strongest current content pattern.',
        'Best-time suggestions should improve as more platform metrics sync.',
    ],
    confidenceScore: 0.68,
    recommendedAction: 'Review detailed analytics, then turn the strongest content pattern into the next calendar plan.',
    generatedBy: 'analytics_ai_insights',
    promptVersion: 'analytics.insights.v1',
};

type AgentArtifact = {
    id?: string;
    artifact_type?: string;
    title?: string;
    summary?: string | null;
    payload?: Record<string, unknown>;
    source_data?: Record<string, unknown>;
    confidence?: number | string | null;
};

function asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, any>)
        : {};
}

function textList(value: unknown, limit = 5) {
    return Array.isArray(value)
        ? value.map((item) => String(item || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, limit)
        : [];
}

function artifactExplanation(artifact: AgentArtifact): AIExplanation {
    const payload = asRecord(artifact.payload);
    const sourceData = asRecord(artifact.source_data);

    return {
        reasonSummary:
            String(
                payload.reasoningSummary ||
                    payload.narrative ||
                    sourceData.reasoningSummary ||
                    artifact.summary ||
                    'This analytics insight is based on the latest worker artifact.'
            ),
        evidence: textList(payload.evidence || sourceData.evidence, 5),
        dataCaveats: textList(payload.dataCaveats || sourceData.dataCaveats, 3),
        confidenceBreakdown: asRecord(payload.confidenceBreakdown || sourceData.confidenceBreakdown),
        confidenceScore: Number(artifact.confidence || payload.confidenceScore || 0),
        expectedImpact: payload.expectedImpact ? String(payload.expectedImpact) : undefined,
        recommendedAction: Array.isArray(payload.recommendedActions)
            ? String(payload.recommendedActions[0] || '')
            : undefined,
        generatedBy: artifact.artifact_type || 'analytics_artifact',
        workerVersion: payload.workerVersion ? String(payload.workerVersion) : undefined,
        promptVersion: payload.promptVersion ? String(payload.promptVersion) : undefined,
    };
}

export function AIInsights({ workspaceId }: { workspaceId?: string }) {
    const [artifact, setArtifact] = useState<AgentArtifact | null>(null);

    useEffect(() => {
        if (!workspaceId) return;

        const controller = new AbortController();
        const params = new URLSearchParams({ workspaceId });
        fetch(`/api/leverage/learning?${params.toString()}`, {
            headers: { 'x-workspace-id': workspaceId },
            signal: controller.signal,
        })
            .then((response) => response.json())
            .then((payload) => {
                const artifacts = Array.isArray(payload?.data?.artifacts) ? payload.data.artifacts : [];
                const selected =
                    artifacts.find((item: AgentArtifact) => item.artifact_type === 'performance_insight') ||
                    artifacts.find((item: AgentArtifact) => item.artifact_type === 'best_time_recommendation') ||
                    null;
                setArtifact(selected);
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') setArtifact(null);
            });

        return () => controller.abort();
    }, [workspaceId]);

    const insight = useMemo(() => {
        if (!artifact) {
            return {
                title: 'AI Performance Insights',
                summary:
                    'Your engagement rate on Instagram has increased by 24% this week. Video content is performing 2.5x better than static images.',
                explanation: performanceExplanation,
                targetType: 'analytics_insight' as AIFeedbackTargetType,
                targetId: 'analytics-overview',
                originalValue: {
                    title: 'AI Performance Insights',
                    content:
                        'Engagement is increasing and video content appears to be outperforming static images.',
                },
                metadata: { source: 'analytics_overview', fallback: true },
            };
        }

        const explanation = artifactExplanation(artifact);
        return {
            title: artifact.title || 'AI Performance Insights',
            summary: artifact.summary || explanation.reasonSummary || 'Xocial analyzed recent performance signals.',
            explanation,
            targetType: 'agent_artifact' as AIFeedbackTargetType,
            targetId: artifact.id || 'analytics-overview',
            originalValue: artifact,
            metadata: {
                source: 'analytics_overview',
                artifactType: artifact.artifact_type,
                explanation,
            },
        };
    }, [artifact]);

    return (
        <Card className="relative overflow-hidden border-secondary-100 bg-white/50 p-1">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 blur-3xl opacity-50" />

            <div className="relative rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-secondary-900">
                                {insight.title}
                            </h3>
                            <p className="text-sm text-secondary-500 max-w-2xl">
                                {insight.summary}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" className="gap-2 border-secondary-200 bg-white hover:bg-secondary-50 hover:border-secondary-300">
                            View Detailed Report
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <WhyExplanation explanation={insight.explanation} compact className="mt-5" />
                <FeedbackControls
                    targetType={insight.targetType}
                    targetId={insight.targetId}
                    title={insight.title}
                    workspaceId={workspaceId}
                    originalValue={insight.originalValue}
                    originalText={insight.summary}
                    metadata={insight.metadata}
                    actions={["accept", "ignore", "mark_off_brand"]}
                    className="mt-4"
                />

                <div className="mt-6 grid gap-4 transition-all md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-100 text-success-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Best posting time</p>
                            <p className="text-xs text-secondary-500">Tuesday, 09:00 AM</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo-100 text-accent-indigo-600">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Top content format</p>
                            <p className="text-xs text-secondary-500">Reels & Shorts</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Audience Growth</p>
                            <p className="text-xs text-secondary-500">+128 new followers</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
