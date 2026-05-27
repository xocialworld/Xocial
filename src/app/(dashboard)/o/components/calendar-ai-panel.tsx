"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

type CalendarAIAction = {
  id: string;
  type:
    | "fill_empty_day"
    | "create_strategy_draft"
    | "create_pillar_balance_draft"
    | "create_best_time_draft";
  title: string;
  description: string;
  scheduledAt: string;
  platforms: Platform[];
  pillar?: string;
  recommendationId?: string;
  sourceArtifactId?: string;
  priority?: string;
  confidence?: number;
  source?: string;
};

type CalendarAIData = {
  summary: {
    emptyDays: number;
    activeRecommendations: number;
    bestTimeSlots: number;
    contentPillars: number;
    plannedPosts: number;
  };
  actions: CalendarAIAction[];
  pillarBalance: Array<{ pillar: string; count: number }>;
};

type CalendarAIPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  currentMonth: Date;
  onDraftCreated: () => Promise<unknown> | unknown;
};

function monthRange(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Suggested slot";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function actionIcon(type: CalendarAIAction["type"]) {
  if (type === "fill_empty_day") return CalendarPlus;
  if (type === "create_best_time_draft") return Clock;
  if (type === "create_pillar_balance_draft") return Target;
  return Sparkles;
}

function priorityVariant(priority?: string) {
  if (priority === "high") return "warning" as const;
  if (priority === "critical") return "error" as const;
  if (priority === "medium") return "info" as const;
  return "default" as const;
}

function platformLabel(platform: string) {
  if (platform === "twitter") return "X";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function CalendarAIPanel({
  open,
  onOpenChange,
  workspaceId,
  currentMonth,
  onDraftCreated,
}: CalendarAIPanelProps) {
  const [data, setData] = useState<CalendarAIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const range = useMemo(() => monthRange(currentMonth), [currentMonth]);

  const loadActions = useCallback(async () => {
    if (!workspaceId || !open) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      const response = await fetch(`/api/calendar/ai-actions?${params.toString()}`, {
        headers: { "x-workspace-id": workspaceId },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to load Calendar AI actions");
      }
      setData(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load Calendar AI actions");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open, range.from, range.to, workspaceId]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const queueRefresh = async () => {
    if (!workspaceId) return;
    setRefreshingSignals(true);
    try {
      const params = new URLSearchParams({ workspaceId });
      const response = await fetch(`/api/calendar/ai-actions?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ type: "queue_refresh" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to queue Calendar AI refresh");
      }
      toast.success("Calendar AI workers queued");
      await loadActions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue Calendar AI refresh");
    } finally {
      setRefreshingSignals(false);
    }
  };

  const applyAction = async (action: CalendarAIAction) => {
    if (!workspaceId) return;
    setApplyingId(action.id);
    try {
      const params = new URLSearchParams({ workspaceId });
      const response = await fetch(`/api/calendar/ai-actions?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          type: action.type,
          title: action.title,
          description: action.description,
          scheduledAt: action.scheduledAt,
          platforms: action.platforms,
          pillar: action.pillar,
          recommendationId: action.recommendationId,
          sourceArtifactId: action.sourceArtifactId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to create planned draft");
      }
      toast.success("Planned draft created");
      await onDraftCreated();
      await loadActions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create planned draft");
    } finally {
      setApplyingId(null);
    }
  };

  const summary = data?.summary;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:w-[520px] sm:max-w-xl">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-secondary-200 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  Calendar AI
                </SheetTitle>
                <SheetDescription>
                  Fill gaps, use best-time signals, balance pillars, and turn strategy into planned drafts.
                </SheetDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={queueRefresh}
                disabled={refreshingSignals}
                className="gap-2"
              >
                {refreshingSignals ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh AI
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5 py-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-lg bg-secondary-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryTile label="Empty days" value={summary?.emptyDays ?? 0} />
                  <SummaryTile label="Strategy items" value={summary?.activeRecommendations ?? 0} />
                  <SummaryTile label="Best slots" value={summary?.bestTimeSlots ?? 0} />
                  <SummaryTile label="Planned drafts" value={summary?.plannedPosts ?? 0} />
                </div>

                {data?.pillarBalance?.length ? (
                  <div className="rounded-lg border border-secondary-200 bg-white p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-secondary-500" />
                      <h3 className="text-sm font-semibold text-secondary-900">Pillar balance</h3>
                    </div>
                    <div className="space-y-2">
                      {data.pillarBalance.slice(0, 5).map((pillar) => (
                        <div key={pillar.pillar} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-secondary-700">{pillar.pillar}</span>
                          <Badge variant={pillar.count === 0 ? "warning" : "secondary"}>
                            {pillar.count} posts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-secondary-900">Recommended actions</h3>
                    <Badge variant="primary">{data?.actions?.length || 0}</Badge>
                  </div>
                  <div className="space-y-3">
                    {data?.actions?.length ? (
                      data.actions.map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          applying={applyingId === action.id}
                          onApply={() => applyAction(action)}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-secondary-300 bg-white p-6 text-center">
                        <Sparkles className="mx-auto h-8 w-8 text-secondary-400" />
                        <p className="mt-3 text-sm font-medium text-secondary-900">No actions yet</p>
                        <p className="mt-1 text-xs text-secondary-500">
                          Queue a refresh after publishing or syncing analytics to generate stronger recommendations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-3">
      <p className="text-xs font-medium text-secondary-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-secondary-950">{value}</p>
    </div>
  );
}

function ActionCard({
  action,
  applying,
  onApply,
}: {
  action: CalendarAIAction;
  applying: boolean;
  onApply: () => void;
}) {
  const Icon = actionIcon(action.type);

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-lg p-2",
            action.type === "create_best_time_draft"
              ? "bg-blue-50 text-blue-700"
              : action.type === "create_pillar_balance_draft"
                ? "bg-amber-50 text-amber-700"
                : "bg-primary-50 text-primary-700"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-secondary-950">{action.title}</h4>
            {action.priority && (
              <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-secondary-600">{action.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary-500">
            <span>{formatDateTime(action.scheduledAt)}</span>
            {action.source && (
              <>
                <span className="h-1 w-1 rounded-full bg-secondary-300" />
                <span>{action.source}</span>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {action.platforms.map((platform) => (
              <Badge key={platform} variant="outline">
                {platformLabel(platform)}
              </Badge>
            ))}
            {action.pillar && <Badge variant="secondary">{action.pillar}</Badge>}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        className="mt-4 w-full gap-2"
        onClick={onApply}
        disabled={applying}
      >
        {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
        Create planned draft
        {!applying && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}
