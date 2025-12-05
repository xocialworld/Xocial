"use client";

import { useStrategy } from "@/hooks/use-strategy";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Sparkles, Check, X, ArrowRight, TrendingUp, Calendar, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'medium': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="L — Leverage"
        description="AI-powered strategy engine to optimize your social growth."
        breadcrumbs={[{ label: "Dashboard", href: "/x" }, { label: "Leverage" }]}
        actions={
          <Button onClick={generateStrategy} disabled={generating}>
            {generating ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Strategy
              </>
            )}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-secondary-900">Active Recommendations</h2>

            {activeRecommendations.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                  <Sparkles className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-secondary-900">No active recommendations</h3>
                <p className="mt-1 text-secondary-500">Generate a new strategy to get started.</p>
                <Button variant="outline" className="mt-4" onClick={generateStrategy}>
                  Generate Now
                </Button>
              </Card>
            ) : (
              activeRecommendations.map((rec) => (
                <Card key={rec.id} className="overflow-hidden border-l-4 border-l-primary-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          {getTypeIcon(rec.type)}
                          <span className="capitalize">{rec.type}</span>
                        </Badge>
                        <Badge className={getPriorityColor(rec.priority)} variant="secondary">
                          {rec.priority} priority
                        </Badge>
                      </div>
                      <span className="text-xs text-secondary-500">
                        {formatDistanceToNow(new Date(rec.created_at))} ago
                      </span>
                    </div>
                    <CardTitle className="text-lg mt-2">{rec.title}</CardTitle>
                    <CardDescription>{rec.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="pb-3">
                    {(() => {
                      const metrics = rec.metrics || {};
                      const { expected_impact, ...otherMetrics } = metrics;
                      const hasMetrics = Object.keys(otherMetrics).length > 0;

                      return (
                        <>
                          {(hasMetrics || expected_impact) && (
                            <div className="bg-secondary-50 rounded-lg p-3 mb-4 space-y-3">
                              {hasMetrics && (
                                <div className="flex gap-4 flex-wrap">
                                  {Object.entries(otherMetrics).map(([key, value]) => (
                                    <div key={key}>
                                      <p className="text-xs text-secondary-500 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
                                      <p className="font-semibold text-secondary-900">{String(value)}</p>
                                    </div>
                                  ))}
                                  <div className="border-l border-secondary-200 pl-4">
                                    <p className="text-xs text-secondary-500 uppercase tracking-wide">Confidence</p>
                                    <p className="font-semibold text-secondary-900">{(rec.confidence_score * 100).toFixed(0)}%</p>
                                  </div>
                                </div>
                              )}
                              
                              {expected_impact && (
                                <div className={hasMetrics ? "pt-2 border-t border-secondary-200" : ""}>
                                  <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">Expected Impact</p>
                                  <p className="text-sm font-medium text-secondary-900">{String(expected_impact)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {rec.action_items && rec.action_items.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-secondary-900">Action Items:</p>
                        <ul className="space-y-1">
                          {rec.action_items.map((item, i) => (
                            <li key={i} className="text-sm text-secondary-600 flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="bg-secondary-50/50 flex justify-end gap-2 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => performAction(rec.id, 'dismiss')}
                      className="text-secondary-500 hover:text-secondary-900"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => performAction(rec.id, 'implement')}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Mark as Implemented
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strategy Cache</CardTitle>
                <CardDescription>Recently implemented strategies</CardDescription>
              </CardHeader>
              <CardContent>
                {completedRecommendations.length === 0 ? (
                  <p className="text-sm text-secondary-500">No implemented strategies yet.</p>
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
              </CardContent>
              {completedRecommendations.length > 0 && (
                <CardFooter>
                  <Button variant="link" className="p-0 h-auto text-primary-600">
                    View All History <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-primary-900 to-secondary-900 text-white border-none">
              <CardHeader>
                <CardTitle className="text-base text-white">AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary-100 mb-4">
                  Your content strategy is improving. Engagement is up 12% since implementing video recommendations.
                </p>
                <div className="flex items-center gap-2 text-xs text-primary-200">
                  <Sparkles className="h-3 w-3" />
                  <span>Updated today</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
