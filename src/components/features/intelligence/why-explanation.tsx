"use client";

import { Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIExplanation } from "@/types/intelligence";

const BREAKDOWN_LABELS: Record<string, string> = {
  brandMemory: "Brand memory",
  performanceData: "Performance data",
  approvalLearning: "Approval learning",
  contentClassification: "Content signals",
  recentActivity: "Recent activity",
  caveatPenalty: "Caveats",
  strategySignal: "Strategy signal",
  platformFit: "Platform fit",
};

function compactText(value: unknown, maxLength = 320) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function normalizeList(value: unknown, limit = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => compactText(item, 180))
    .filter(Boolean)
    .slice(0, limit);
}

function breakdownItems(value: Record<string, unknown> | undefined) {
  return Object.entries(value || {})
    .filter(([key]) => key !== "score")
    .map(([key, raw]) => ({
      key,
      label: BREAKDOWN_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
      value: Number(raw || 0),
    }))
    .filter((item) => Number.isFinite(item.value))
    .slice(0, 6);
}

function sourceLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function WhyExplanation({
  explanation,
  fallbackReason,
  compact = false,
  className,
}: {
  explanation?: AIExplanation | null;
  fallbackReason?: string;
  compact?: boolean;
  className?: string;
}) {
  const details = explanation?.details || [];
  const evidence = normalizeList(explanation?.evidence || explanation?.sourceSignals, compact ? 3 : 5);
  const caveats = normalizeList(explanation?.dataCaveats, compact ? 2 : 4);
  const breakdown = breakdownItems(explanation?.confidenceBreakdown);
  const sourceItems = [
    explanation?.generatedBy ? sourceLabel(explanation.generatedBy) : null,
    explanation?.workerVersion ? sourceLabel(explanation.workerVersion) : null,
    explanation?.promptVersion ? sourceLabel(explanation.promptVersion) : null,
  ].filter(Boolean) as string[];
  const reason = compactText(
    explanation?.reasonSummary ||
      fallbackReason ||
      (explanation
        ? "Xocial has limited evidence for this recommendation yet. Treat it as a draft signal and add more posts, metrics, or feedback to improve confidence."
        : ""),
    compact ? 220 : 360
  );
  const hasContent =
    Boolean(reason) ||
    evidence.length > 0 ||
    caveats.length > 0 ||
    breakdown.length > 0 ||
    details.length > 0 ||
    sourceItems.length > 0 ||
    explanation?.confidenceScore !== undefined ||
    Boolean(explanation?.expectedImpact || explanation?.recommendedAction || explanation?.calendarAction);
  const detailItems = [
    explanation?.expectedImpact
      ? { label: "Expected impact", value: explanation.expectedImpact }
      : null,
    explanation?.recommendedAction
      ? { label: "Recommended action", value: explanation.recommendedAction }
      : null,
    explanation?.calendarAction
      ? { label: "Calendar action", value: explanation.calendarAction }
      : null,
    explanation?.contentPillar
      ? { label: "Content pillar", value: explanation.contentPillar }
      : null,
    ...details,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const hasExpandedContent = detailItems.length > 0 || evidence.length > 0 || breakdown.length > 0 || caveats.length > 0;

  if (!hasContent) return null;

  const expanded = (
    <>
      {detailItems.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {detailItems.slice(0, compact ? 2 : 6).map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-md bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-500">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-secondary-700">
                {compactText(item.value, 180)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {evidence.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">Evidence</p>
          <ul className="mt-2 space-y-1.5 text-sm text-secondary-650">
            {evidence.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {breakdown.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {breakdown.map((item) => (
            <Badge key={item.key} variant={item.key === "caveatPenalty" ? "warning" : "secondary"}>
              {item.label}: {Math.round(item.value * 100)}%
            </Badge>
          ))}
        </div>
      ) : null}

      {caveats.length ? (
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-2">
          <p className="text-xs font-medium text-orange-900">Data caveats</p>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed text-orange-800">
            {caveats.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={cn("rounded-lg border border-secondary-200 bg-secondary-50 p-3", className)}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-md bg-white p-1.5 text-primary-700">
          <Lightbulb className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-secondary-950">Why Xocial thinks this</p>
            {explanation?.confidenceScore !== undefined && (
              <Badge variant="secondary">{Math.round(Number(explanation.confidenceScore) * 100)}% confidence</Badge>
            )}
            {sourceItems.slice(0, compact ? 1 : 3).map((item) => (
              <Badge key={item} variant="outline">{item}</Badge>
            ))}
          </div>

          {reason ? <p className="mt-1 text-sm leading-relaxed text-secondary-600">{reason}</p> : null}

          {compact && hasExpandedContent ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-primary-700">
                View evidence and caveats
              </summary>
              {expanded}
            </details>
          ) : (
            expanded
          )}
        </div>
      </div>
    </div>
  );
}
