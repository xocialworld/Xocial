"use client";

import { useStrategy } from "@/hooks/use-strategy";
import {
  PageHeader,
  PageContainer,
  ContentCard,
  EmptyState,
  SectionTitle
} from "@/components/shared/page-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Sparkles,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Calendar,
  Hash,
  Lightbulb,
  Zap,
  Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function LeveragePage() {
  const { recommendations, loading, generating, generateStrategy, performAction } = useStrategy();

  const activeRecommendations = recommendations.filter(r => r.status === 'pending' || r.status === 'active');
  const completedRecommendations = recommendations.filter(r => r.status === 'completed');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'content': return <Sparkles className="h-4 w-4" />;
      case 'growth': return <TrendingUp className="h-4 w-4" />;
      case 'timing': return <Calendar className="h-4 w-4" />;
      case 'hashtag': return <Hash className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'content': return 'bg-purple-100 text-purple-700';
      case 'growth': return 'bg-green-100 text-green-700';
      case 'timing': return 'bg-blue-100 text-blue-700';
      case 'hashtag': return 'bg-orange-100 text-orange-700';
      default: return 'bg-secondary-100 text-secondary-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-secondary-100 text-secondary-600 border-secondary-200';
    }
  };

  const getBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-blue-500';
      default: return 'border-l-primary-500';
    }
  };

  return (
    <PageContainer>
      <PageHeader
        shortCode="L"
        title="Leverage"
        description="AI-powered strategy engine to optimize your social growth."
        icon={Lightbulb}
        iconColor="text-yellow-500"
        badge={activeRecommendations.length > 0 ? {
          label: `${activeRecommendations.length} active`,
          variant: 'success'
        } : undefined}
        actions={
          <Button
            onClick={generateStrategy}
            disabled={generating}
            className="gap-2 shadow-lg shadow-primary-500/20"
          >
            {generating ? (
              <>
                <Spinner className="h-4 w-4" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Strategy
              </>
            )}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-secondary-500">Loading recommendations...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <SectionTitle
              title="Active Recommendations"
              description={`${activeRecommendations.length} recommendations need your attention`}
            />

            {activeRecommendations.length === 0 ? (
              <ContentCard>
                <EmptyState
                  icon={Target}
                  title="No active recommendations"
                  description="Generate a new strategy to get personalized recommendations based on your content performance."
                  action={{
                    label: "Generate Strategy",
                    onClick: generateStrategy,
                    icon: Sparkles
                  }}
                />
              </ContentCard>
            ) : (
              <div className="space-y-4">
                {activeRecommendations.map((rec) => (
                  <ContentCard
                    key={rec.id}
                    padding="none"
                    className={cn(
                      "overflow-hidden border-l-4 hover:shadow-lg transition-shadow",
                      getBorderColor(rec.priority)
                    )}
                  >
                    <div className="p-6 pb-4">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn("gap-1.5", getTypeColor(rec.type))}>
                            {getTypeIcon(rec.type)}
                            <span className="capitalize">{rec.type}</span>
                          </Badge>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <span className="text-xs text-secondary-500">
                          {formatDistanceToNow(new Date(rec.created_at))} ago
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">{rec.title}</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">{rec.description}</p>
                    </div>

                    <div className="px-6 pb-4">
                      {(() => {
                        const metrics = rec.metrics || {};
                        const { expected_impact, ...otherMetrics } = metrics;
                        const hasMetrics = Object.keys(otherMetrics).length > 0;

                        return (
                          <>
                            {(hasMetrics || expected_impact) && (
                              <div className="bg-secondary-50 rounded-xl p-4 mb-4 space-y-3">
                                {hasMetrics && (
                                  <div className="flex gap-6 flex-wrap">
                                    {Object.entries(otherMetrics).map(([key, value]) => (
                                      <div key={key}>
                                        <p className="text-xs text-secondary-500 uppercase tracking-wide font-medium">{key.replace(/_/g, ' ')}</p>
                                        <p className="font-bold text-lg text-secondary-900">{String(value)}</p>
                                      </div>
                                    ))}
                                    <div className="border-l border-secondary-200 pl-6">
                                      <p className="text-xs text-secondary-500 uppercase tracking-wide font-medium">Confidence</p>
                                      <p className="font-bold text-lg text-secondary-900">{(rec.confidence_score * 100).toFixed(0)}%</p>
                                    </div>
                                  </div>
                                )}

                                {expected_impact && (
                                  <div className={hasMetrics ? "pt-3 border-t border-secondary-200" : ""}>
                                    <p className="text-xs text-secondary-500 uppercase tracking-wide font-medium mb-1">Expected Impact</p>
                                    <p className="text-sm font-medium text-secondary-800">{String(expected_impact)}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {rec.action_items && rec.action_items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-secondary-900">Action Items:</p>
                          <ul className="space-y-2">
                            {rec.action_items.map((item, i) => (
                              <li key={i} className="text-sm text-secondary-600 flex items-start gap-3">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="bg-secondary-50/80 px-6 py-4 flex flex-wrap justify-end gap-3 border-t border-secondary-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => performAction(rec.id, 'dismiss')}
                        className="text-secondary-500 hover:text-secondary-900"
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => performAction(rec.id, 'implement')}
                        className="shadow-sm"
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Mark as Implemented
                      </Button>
                    </div>
                  </ContentCard>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ContentCard hover>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-secondary-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900">Strategy Cache</h3>
                  <p className="text-xs text-secondary-500">Recently implemented</p>
                </div>
              </div>

              {completedRecommendations.length === 0 ? (
                <p className="text-sm text-secondary-500 py-4 text-center">No implemented strategies yet.</p>
              ) : (
                <div className="space-y-4">
                  {completedRecommendations.slice(0, 5).map(rec => (
                    <div key={rec.id} className="border-b border-secondary-100 last:border-0 pb-3 last:pb-0">
                      <p className="text-sm font-medium text-secondary-900 line-clamp-1">{rec.title}</p>
                      <p className="text-xs text-secondary-500 mt-1">
                        Implemented {rec.implemented_at ? formatDistanceToNow(new Date(rec.implemented_at)) : 'recently'} ago
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {completedRecommendations.length > 0 && (
                <div className="pt-4 border-t border-secondary-100 mt-4">
                  <Button variant="link" className="p-0 h-auto text-primary-600 text-sm">
                    View All History <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}
            </ContentCard>

            <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">AI Insights</h3>
                </div>
                <p className="text-sm text-primary-100 mb-4 leading-relaxed">
                  Your content strategy is improving. Engagement is up 12% since implementing video recommendations.
                </p>
                <div className="flex items-center gap-2 text-xs text-primary-200">
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Updated today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
