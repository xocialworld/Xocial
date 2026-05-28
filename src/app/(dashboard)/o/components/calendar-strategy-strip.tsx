"use client";

import { BarChart3, CalendarPlus, Clock, Layers3, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarStrategyHealth } from "@/types/intelligence";

type CalendarStrategyStripProps = {
  health?: CalendarStrategyHealth;
  loading?: boolean;
  onOpenAIPlan: () => void;
};

function healthLabel(health?: CalendarStrategyHealth) {
  if (!health) return "Loading";
  if (health.status === "healthy") return "Healthy";
  if (health.status === "at_risk") return "At risk";
  return "Needs attention";
}

function healthClasses(health?: CalendarStrategyHealth) {
  if (!health) return "text-secondary-500";
  if (health.status === "healthy") return "text-emerald-700";
  if (health.status === "at_risk") return "text-red-700";
  return "text-amber-700";
}

export function CalendarStrategyStrip({
  health,
  loading,
  onOpenAIPlan,
}: CalendarStrategyStripProps) {
  const metrics = [
    { label: "Empty slots", value: health?.emptyDays ?? 0, icon: CalendarPlus },
    { label: "Pillar gaps", value: health?.underusedPillars ?? 0, icon: Target },
    { label: "Best times", value: health?.bestTimeSlots ?? 0, icon: Clock },
    { label: "Platform gaps", value: health?.platformGaps ?? 0, icon: Layers3 },
    { label: "Campaign gaps", value: health?.campaignGaps ?? 0, icon: BarChart3 },
  ];

  return (
    <div className="border-b border-secondary-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-semibold text-secondary-950">Strategy surface</span>
            <Badge variant={health?.status === "healthy" ? "success" : health?.status === "at_risk" ? "error" : "warning"}>
              {health?.score ?? 0}%
            </Badge>
            <span className={cn("text-xs font-medium", healthClasses(health))}>
              {loading ? "Refreshing..." : healthLabel(health)}
            </span>
          </div>
          <div className="hidden h-5 w-px bg-secondary-200 lg:block" />
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <span
                  key={metric.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-secondary-200 bg-secondary-50 px-2.5 py-1 text-xs text-secondary-700"
                >
                  <Icon className="h-3.5 w-3.5 text-secondary-500" />
                  <span className="font-semibold text-secondary-950">{metric.value}</span>
                  {metric.label}
                </span>
              );
            })}
          </div>
        </div>
        <Button size="sm" onClick={onOpenAIPlan} className="w-full gap-2 xl:w-auto">
          <Sparkles className="h-4 w-4" />
          AI Plan
        </Button>
      </div>
    </div>
  );
}
