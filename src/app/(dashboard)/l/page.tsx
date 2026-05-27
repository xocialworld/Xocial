"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  Edit3,
  FileText,
  Hash,
  Lightbulb,
  LineChart,
  ListChecks,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import {
  PageHeader,
  PageContainer,
  ContentCard,
  EmptyState,
  SectionTitle,
} from "@/components/shared/page-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import type { Platform, StrategyRecommendation } from "@/types";
import type { BrandProfile, ContentScore, LeverageInsight } from "@/types/intelligence";

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X/Twitter" },
  { value: "tiktok", label: "TikTok" },
];

const STRATEGY_WORKERS: Array<{ agentType: string; label: string; icon: LucideIcon }> = [
  { agentType: "strategy_planner", label: "Weekly Strategy Plan", icon: CalendarClock },
  { agentType: "best_time", label: "Best-Time Analysis", icon: LineChart },
  { agentType: "performance_analyst", label: "Performance Analyst", icon: BarChart3 },
  { agentType: "safety", label: "Brand Safety Review", icon: ShieldCheck },
];

const REPORT_WORKERS: Array<{
  title: string;
  description: string;
  agent: string;
  icon: LucideIcon;
}> = [
  {
    title: "Weekly Client Report",
    description: "Summarize output, performance, blockers, and next actions for agencies.",
    agent: "reporting",
    icon: FileText,
  },
  {
    title: "Performance Narrative",
    description: "Explain what changed, why it changed, and what Xocial recommends next.",
    agent: "performance_analyst",
    icon: BarChart3,
  },
  {
    title: "Strategy Refresh",
    description: "Create a new plan from Brand Brain, post outcomes, approvals, and synced metrics.",
    agent: "strategy_planner",
    icon: BookOpen,
  },
];

const LEARNING_WORKERS: Array<{ agent: string; label: string }> = [
  { agent: "signal_ingestion", label: "Signal Ingestion" },
  { agent: "content_classifier", label: "Content Classifier" },
  { agent: "brand_learner", label: "Brand Learner" },
  { agent: "reporting", label: "Reporting" },
];

type OverviewData = {
  summary: {
    brandCompletion: number;
    activeRecommendations: number;
    publishedPosts: number;
    scheduledPosts: number;
    failedPosts: number;
    activeAccounts: number;
    learningEvents: number;
  };
  insights: LeverageInsight[];
  recommendations: StrategyRecommendation[];
  recentLearning: LearningEvent[];
  accounts: Array<Record<string, unknown>>;
  brandProfile: BrandProfile;
};

type LearningEvent = {
  id: string;
  event_type: string;
  source: string;
  entity_type?: string | null;
  platform?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at: string;
};

type LearningData = {
  events: LearningEvent[];
  artifacts: AgentArtifact[];
  tasks: AgentTask[];
  sourceCounts: Record<string, number>;
  sources: Record<string, boolean>;
};

type AgentTask = {
  id?: string;
  agent_type?: string;
  status?: string;
  priority?: number | string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  error_message?: string | null;
  retry_count?: number | string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BrandSuggestionField =
  | "voice"
  | "audience"
  | "products_offers"
  | "content_pillars"
  | "competitors"
  | "do_rules"
  | "dont_rules"
  | "approved_examples"
  | "rejected_examples"
  | "platform_preferences";

type BrandSuggestionPayload = {
  field?: BrandSuggestionField | string;
  operation?: string;
  suggestedValue?: unknown;
  reason?: string;
  evidence?: unknown[];
  applied?: Record<string, unknown>;
};

type AgentArtifact = {
  id?: string;
  artifact_type?: string;
  status?: string;
  title?: string;
  summary?: string | null;
  payload?: BrandSuggestionPayload | Record<string, unknown>;
  confidence?: number | string | null;
  source_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type PredictionData = {
  score: ContentScore;
};

type BrandDraft = BrandProfile & {
  productsText: string;
  pillarsText: string;
  competitorsText: string;
  doRulesText: string;
  dontRulesText: string;
  approvedText: string;
  rejectedText: string;
};

const emptyBrandProfile: BrandProfile = {
  voice: "",
  audience: "",
  products_offers: [],
  content_pillars: [],
  competitors: [],
  do_rules: [],
  dont_rules: [],
  approved_examples: [],
  rejected_examples: [],
  platform_preferences: {},
  confidence_score: 0,
};

const BRAND_TEXT_FIELDS = new Set<BrandSuggestionField>(["voice", "audience"]);
const BRAND_ARRAY_FIELDS = new Set<BrandSuggestionField>([
  "products_offers",
  "content_pillars",
  "competitors",
  "do_rules",
  "dont_rules",
  "approved_examples",
  "rejected_examples",
]);
const BRAND_OBJECT_FIELDS = new Set<BrandSuggestionField>(["platform_preferences"]);

const BRAND_FIELD_LABELS: Record<BrandSuggestionField, string> = {
  voice: "Brand Voice",
  audience: "Audience",
  products_offers: "Products / Offers",
  content_pillars: "Content Pillars",
  competitors: "Competitors",
  do_rules: "Do Rules",
  dont_rules: "Do Not Rules",
  approved_examples: "Approved Examples",
  rejected_examples: "Rejected Examples",
  platform_preferences: "Platform Preferences",
};

function arrayToText(value: string[] | undefined) {
  return (value || []).join("\n");
}

function textToArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToDraft(profile: BrandProfile): BrandDraft {
  return {
    ...emptyBrandProfile,
    ...profile,
    productsText: arrayToText(profile.products_offers),
    pillarsText: arrayToText(profile.content_pillars),
    competitorsText: arrayToText(profile.competitors),
    doRulesText: arrayToText(profile.do_rules),
    dontRulesText: arrayToText(profile.dont_rules),
    approvedText: arrayToText(profile.approved_examples),
    rejectedText: arrayToText(profile.rejected_examples),
  };
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message || "Request failed");
  }
  return payload.data as T;
}

function priorityVariant(priority: string) {
  if (priority === "critical") return "error" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "info" as const;
  return "default" as const;
}

function workerStatusVariant(status: string) {
  if (status === "succeeded") return "success" as const;
  if (status === "failed") return "error" as const;
  if (status === "running") return "info" as const;
  return "default" as const;
}

function relativeTime(value?: string | null) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return `${formatDistanceToNow(date)} ago`;
}

function taskRuntime(task: AgentTask) {
  const startedAt = task.started_at ? new Date(task.started_at).getTime() : null;
  const finishedAt = task.finished_at ? new Date(task.finished_at).getTime() : null;
  if (!startedAt || Number.isNaN(startedAt)) return null;
  const end = finishedAt && !Number.isNaN(finishedAt) ? finishedAt : Date.now();
  const seconds = Math.max(1, Math.round((end - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isBrandSuggestionField(value: unknown): value is BrandSuggestionField {
  return typeof value === "string" && value in BRAND_FIELD_LABELS;
}

function asBrandSuggestionPayload(artifact: AgentArtifact | null | undefined): BrandSuggestionPayload {
  const payload = artifact?.payload;
  return payload && typeof payload === "object" ? (payload as BrandSuggestionPayload) : {};
}

function brandFieldToText(profile: BrandProfile | null | undefined, field: BrandSuggestionField | null) {
  if (!profile || !field) return "";
  if (BRAND_TEXT_FIELDS.has(field)) {
    return String(profile[field] || "");
  }
  if (BRAND_ARRAY_FIELDS.has(field)) {
    return arrayToText((profile[field] as string[] | undefined) || []);
  }
  if (BRAND_OBJECT_FIELDS.has(field)) {
    return Object.entries(profile.platform_preferences || {})
      .map(([platform, preference]) => `${platform}: ${preference}`)
      .join("\n");
  }
  return "";
}

function suggestionValueToText(value: unknown, field: BrandSuggestionField | null) {
  if (!field) return "";
  if (BRAND_OBJECT_FIELDS.has(field)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>)
        .map(([platform, preference]) => `${platform}: ${String(preference || "")}`)
        .join("\n");
    }
    return String(value || "");
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).join("\n");
  }
  return String(value || "").trim();
}

function parseSuggestionDraft(value: string, field: BrandSuggestionField | null) {
  if (!field) return value;
  if (BRAND_ARRAY_FIELDS.has(field)) {
    return textToArray(value);
  }
  if (BRAND_OBJECT_FIELDS.has(field)) {
    return Object.fromEntries(
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.includes(":") ? ":" : "=";
          const [platform, ...rest] = line.split(separator);
          return [platform.trim(), rest.join(separator).trim()];
        })
        .filter(([platform, preference]) => Boolean(platform && preference))
    );
  }
  return value.trim();
}

function getBrandSuggestionField(artifact: AgentArtifact | null | undefined) {
  const field = asBrandSuggestionPayload(artifact).field;
  return isBrandSuggestionField(field) ? field : null;
}

function defaultApplyMode(payload: BrandSuggestionPayload) {
  return ["replace", "set"].includes(String(payload.operation || "")) ? "replace" : "append";
}

function evidenceItems(payload: BrandSuggestionPayload) {
  return Array.isArray(payload.evidence)
    ? payload.evidence.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "secondary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "green" | "orange" | "red" | "secondary";
}) {
  const toneClasses = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
    secondary: "bg-secondary-100 text-secondary-700",
  };

  return (
    <ContentCard className="min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-secondary-950">{value}</p>
        </div>
        <div className={cn("rounded-lg p-2", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </ContentCard>
  );
}

function ScoreBar({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-secondary-800">{label}</span>
        <span className="text-sm font-semibold text-secondary-950">{Math.round(value)}%</span>
      </div>
      <Progress value={value} className="h-2 bg-secondary-100" />
      {helper && <p className="mt-1 text-xs text-secondary-500">{helper}</p>}
    </div>
  );
}

function InsightCard({
  insight,
  onAction,
}: {
  insight: LeverageInsight;
  onAction: (insight: LeverageInsight) => void;
}) {
  const iconMap = {
    growth: TrendingUp,
    content: Sparkles,
    timing: CalendarClock,
    brand: Brain,
    risk: AlertTriangle,
    learning: Activity,
  };
  const Icon = iconMap[insight.type] || Lightbulb;

  return (
    <ContentCard hover className="border-l-4 border-l-primary-400">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 rounded-lg bg-primary-50 p-2 text-primary-700">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-secondary-950">{insight.title}</h3>
              <Badge variant={priorityVariant(insight.priority)}>{insight.priority}</Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-secondary-600">{insight.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary-500">
              <span>{insight.source}</span>
              <span className="h-1 w-1 rounded-full bg-secondary-300" />
              <span>{Math.round(insight.confidence * 100)}% confidence</span>
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onAction(insight)} className="shrink-0 gap-2">
          {insight.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </ContentCard>
  );
}

function PlatformToggles({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORM_OPTIONS.map((platform) => {
        const checked = selected.includes(platform.value);
        return (
          <label
            key={platform.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-primary-300 bg-primary-50 text-primary-800"
                : "border-secondary-200 bg-white text-secondary-700 hover:border-secondary-300"
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                if (next) {
                  onChange(Array.from(new Set([...selected, platform.value])));
                } else {
                  const nextPlatforms = selected.filter((item) => item !== platform.value);
                  onChange(nextPlatforms.length ? nextPlatforms : selected);
                }
              }}
            />
            <span>{platform.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function TextListField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-secondary-800">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-y"
      />
    </label>
  );
}

function BrandSuggestionReviewDialog({
  artifact,
  brandProfile,
  open,
  onOpenChange,
  loading,
  onAccept,
  onIgnore,
}: {
  artifact: AgentArtifact | null;
  brandProfile: BrandProfile | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onAccept: (artifactId: string, payload: Record<string, unknown>) => Promise<void>;
  onIgnore: (artifactId: string) => Promise<void>;
}) {
  const payload = asBrandSuggestionPayload(artifact);
  const field = getBrandSuggestionField(artifact);
  const artifactId = String(artifact?.id || "");
  const [editedValue, setEditedValue] = useState("");
  const [applyMode, setApplyMode] = useState("append");

  useEffect(() => {
    if (!open || !artifact) return;
    setEditedValue(suggestionValueToText(payload.suggestedValue, field));
    setApplyMode(defaultApplyMode(payload));
  }, [artifact, field, open, payload]);

  const currentValue = brandFieldToText(brandProfile, field);
  const evidence = evidenceItems(payload);
  const fieldLabel = field ? BRAND_FIELD_LABELS[field] : "Brand Brain";
  const applyOptions = [
    {
      value: "append",
      label: BRAND_OBJECT_FIELDS.has(field as BrandSuggestionField)
        ? "Merge into current"
        : "Append to current",
    },
    { value: "replace", label: "Replace field" },
  ];

  const acceptSuggestion = async () => {
    if (!artifactId || !field) return;
    await onAccept(artifactId, {
      field,
      applyMode,
      editedValue: parseSuggestionDraft(editedValue, field),
    });
  };

  const ignoreSuggestion = async () => {
    if (!artifactId) return;
    await onIgnore(artifactId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0" onClose={() => onOpenChange(false)}>
        <DialogHeader className="border-b border-secondary-200 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">Brand Learner</Badge>
            <Badge variant="outline">{fieldLabel}</Badge>
          </div>
          <DialogTitle className="mt-3">Review Brand Brain suggestion</DialogTitle>
          <DialogDescription>
            Xocial can propose memory updates, but you decide the exact wording before it becomes part of the brand.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <p className="text-sm font-semibold text-secondary-950">Current Brand Brain</p>
              <p className="mt-1 text-xs text-secondary-500">{fieldLabel}</p>
              <div className="mt-3 min-h-[160px] whitespace-pre-wrap rounded-md border border-secondary-200 bg-white p-3 text-sm text-secondary-700">
                {currentValue || "No saved value yet."}
              </div>
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-secondary-950">Suggested Update</p>
                  <p className="mt-1 text-xs text-secondary-500">Edit this before accepting.</p>
                </div>
                <Select
                  options={applyOptions}
                  value={applyMode}
                  onChange={setApplyMode}
                  className="sm:w-44"
                />
              </div>
              <Textarea
                value={editedValue}
                onChange={(event) => setEditedValue(event.target.value)}
                rows={8}
                className="mt-3 bg-white"
                placeholder={
                  BRAND_OBJECT_FIELDS.has(field as BrandSuggestionField)
                    ? "instagram: Shorter hooks with product proof"
                    : "One rule, pillar, example, or preference per line"
                }
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-secondary-200 p-4">
              <p className="text-sm font-semibold text-secondary-950">Why Xocial suggested this</p>
              <p className="mt-2 text-sm leading-relaxed text-secondary-600">
                {payload.reason || artifact?.summary || "Generated from recent learning signals."}
              </p>
            </div>
            <div className="rounded-lg border border-secondary-200 p-4">
              <p className="text-sm font-semibold text-secondary-950">Evidence</p>
              {evidence.length ? (
                <ul className="mt-2 space-y-2 text-sm text-secondary-600">
                  {evidence.slice(0, 5).map((item, index) => (
                    <li key={`${artifactId}-evidence-${index}`} className="rounded-md bg-secondary-50 p-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-secondary-500">No detailed evidence was attached to this artifact.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-secondary-200 px-6 py-4">
          <Button variant="outline" onClick={ignoreSuggestion} disabled={loading}>
            Ignore
          </Button>
          <Button onClick={acceptSuggestion} disabled={loading || !field || !editedValue.trim()} className="gap-2">
            {loading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            Accept Edited Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeveragePage() {
  const router = useRouter();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [learning, setLearning] = useState<LearningData | null>(null);
  const [brandDraft, setBrandDraft] = useState<BrandDraft>(profileToDraft(emptyBrandProfile));
  const [loading, setLoading] = useState(true);
  const [savingBrand, setSavingBrand] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState<string | null>(null);
  const [processingWorkers, setProcessingWorkers] = useState(false);
  const [artifactLoading, setArtifactLoading] = useState<string | null>(null);
  const [reviewingBrandArtifact, setReviewingBrandArtifact] = useState<AgentArtifact | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [predictionContent, setPredictionContent] = useState("");
  const [predictionPlatforms, setPredictionPlatforms] = useState<Platform[]>([
    "instagram",
    "youtube",
  ]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [hashtagContent, setHashtagContent] = useState("");
  const [hashtagPlatform, setHashtagPlatform] = useState<Platform>("instagram");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const workspaceQuery = useMemo(() => {
    if (!workspace?.id) return "";
    return new URLSearchParams({ workspaceId: workspace.id }).toString();
  }, [workspace?.id]);

  const fetchLeverage = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const [overviewData, learningData] = await Promise.all([
        fetch(`/api/leverage/overview?${workspaceQuery}`).then((response) =>
          readApiData<OverviewData>(response)
        ),
        fetch(`/api/leverage/learning?${workspaceQuery}`).then((response) =>
          readApiData<LearningData>(response)
        ),
      ]);
      setOverview(overviewData);
      setLearning(learningData);
      setBrandDraft(profileToDraft(overviewData.brandProfile || emptyBrandProfile));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load Xocial AI");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, workspaceQuery]);

  useEffect(() => {
    fetchLeverage();
  }, [fetchLeverage]);

  const saveBrandBrain = async () => {
    if (!workspace?.id) return;
    setSavingBrand(true);
    try {
      const payload = {
        voice: brandDraft.voice,
        audience: brandDraft.audience,
        products_offers: textToArray(brandDraft.productsText),
        content_pillars: textToArray(brandDraft.pillarsText),
        competitors: textToArray(brandDraft.competitorsText),
        do_rules: textToArray(brandDraft.doRulesText),
        dont_rules: textToArray(brandDraft.dontRulesText),
        approved_examples: textToArray(brandDraft.approvedText),
        rejected_examples: textToArray(brandDraft.rejectedText),
        platform_preferences: brandDraft.platform_preferences || {},
        knowledge_settings: brandDraft.knowledge_settings || {},
      };
      const data = await fetch(`/api/leverage/brand-brain?${workspaceQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) =>
        readApiData<{ profile: BrandProfile; completion: number }>(response)
      );
      setBrandDraft(profileToDraft(data.profile));
      toast.success("Brand Brain updated");
      await fetchLeverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save Brand Brain");
    } finally {
      setSavingBrand(false);
    }
  };

  const runStrategy = async () => {
    if (!workspace?.id) return;
    setStrategyLoading(true);
    try {
      await fetch(`/api/leverage/strategy?${workspaceQuery}`, { method: "POST" }).then((response) =>
        readApiData(response)
      );
      toast.success("Xocial AI strategy updated");
      await fetchLeverage();
      setActiveTab("strategy");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate strategy");
    } finally {
      setStrategyLoading(false);
    }
  };

  const queueAgentTask = async (agentType: string, label: string) => {
    if (!workspace?.id) return;
    setTaskLoading(agentType);
    try {
      await fetch(`/api/agent-tasks/run?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType,
          inputPayload: {
            requestedFrom: "leverage",
            label,
          },
        }),
      }).then((response) => readApiData(response));
      toast.success(`${label} queued`);
      await fetchLeverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to queue ${label}`);
    } finally {
      setTaskLoading(null);
    }
  };

  const processDueWorkers = async () => {
    if (!workspace?.id) return;
    setProcessingWorkers(true);
    try {
      const result = await fetch(`/api/agent-tasks/process?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 8 }),
      }).then((response) =>
        readApiData<{
          processed: number;
          succeeded: number;
          failed: number;
          retryScheduled: number;
          recoveredStale: number;
          failedStale: number;
        }>(response)
      );

      const activityCount =
        Number(result.processed || 0) +
        Number(result.recoveredStale || 0) +
        Number(result.failedStale || 0);
      toast.success(
        activityCount > 0
          ? `Processed ${result.processed} worker task${result.processed === 1 ? "" : "s"}`
          : "No due worker tasks"
      );
      await fetchLeverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to process workers");
    } finally {
      setProcessingWorkers(false);
    }
  };

  const runPrediction = async () => {
    if (!workspace?.id) return;
    setPredicting(true);
    try {
      const data = await fetch(`/api/leverage/predict?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: predictionContent,
          platforms: predictionPlatforms,
        }),
      }).then((response) => readApiData<PredictionData>(response));
      setPrediction(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to score content");
    } finally {
      setPredicting(false);
    }
  };

  const generateHashtagSet = async () => {
    if (!workspace?.id) return;
    setHashtagLoading(true);
    try {
      const data = await fetch(`/api/leverage/hashtags?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: hashtagContent,
          platform: hashtagPlatform,
          count: 14,
        }),
      }).then((response) => readApiData<{ hashtags: string[] }>(response));
      setHashtags(data.hashtags);
      toast.success("Hashtag set generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate hashtags");
    } finally {
      setHashtagLoading(false);
    }
  };

  const handleInsightAction = async (insight: LeverageInsight) => {
    if (insight.action === "review_brand") {
      setActiveTab("brand");
      return;
    }
    if (insight.action === "create_draft") {
      router.push("/c");
      return;
    }
    if (insight.action === "push_calendar") {
      router.push("/o");
      return;
    }
    if (insight.action === "view_analytics") {
      router.push("/a");
      return;
    }
    await runStrategy();
  };

  const performRecommendationAction = async (
    recommendationId: string,
    action: "recommendation_accept" | "recommendation_dismiss" | "recommendation_complete"
  ) => {
    if (!workspace?.id) return;
    try {
      await fetch(`/api/leverage/actions?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId: recommendationId }),
      }).then((response) => readApiData(response));
      toast.success(action === "recommendation_dismiss" ? "Recommendation dismissed" : "Recommendation updated");
      await fetchLeverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update recommendation");
    }
  };

  const performArtifactAction = async (
    artifactId: string,
    action: "artifact_accept" | "artifact_ignore",
    payload: Record<string, unknown> = {}
  ) => {
    if (!workspace?.id) return;
    setArtifactLoading(artifactId);
    try {
      await fetch(`/api/leverage/actions?${workspaceQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId: artifactId, payload }),
      }).then((response) => readApiData(response));
      toast.success(action === "artifact_accept" ? "AI suggestion accepted" : "AI suggestion ignored");
      setReviewingBrandArtifact(null);
      await fetchLeverage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update AI suggestion");
    } finally {
      setArtifactLoading(null);
    }
  };

  const summary = overview?.summary;
  const recommendationCount = overview?.recommendations?.length || 0;
  const workerTasks = learning?.tasks || [];
  const failedWorkerTasks = workerTasks.filter((task) => task.status === "failed");

  if (workspaceLoading || loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-24">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-secondary-500">Loading Xocial AI...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        shortCode="L"
        title="Leverage"
        description="Xocial AI for brand memory, strategy, predictions, trends, hashtags, reports, and continuous learning."
        icon={Lightbulb}
        iconColor="text-yellow-500"
        badge={
          recommendationCount
            ? {
                label: `${recommendationCount} active`,
                variant: "success",
              }
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={fetchLeverage} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={runStrategy} disabled={strategyLoading} className="gap-2">
              {strategyLoading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              Generate Strategy
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-5 overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="brand">Brand Brain</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predict">Predictions</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="learning">AI Learning</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Brand Brain"
              value={`${summary?.brandCompletion ?? 0}%`}
              icon={Brain}
              tone="primary"
            />
            <StatTile
              label="Published Posts"
              value={summary?.publishedPosts ?? 0}
              icon={FileText}
              tone="green"
            />
            <StatTile
              label="Scheduled"
              value={summary?.scheduledPosts ?? 0}
              icon={CalendarClock}
              tone="orange"
            />
            <StatTile
              label="Learning Signals"
              value={summary?.learningEvents ?? 0}
              icon={Activity}
              tone="secondary"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <SectionTitle
                title="Recommended Actions"
                description="Xocial AI turns brand, publishing, and analytics signals into decisions."
              />
              {overview?.insights?.length ? (
                <div className="space-y-3">
                  {overview.insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} onAction={handleInsightAction} />
                  ))}
                </div>
              ) : (
                <ContentCard>
                  <EmptyState
                    icon={Target}
                    title="No urgent recommendations"
                    description="Run a fresh strategy audit after publishing or syncing more data."
                    action={{
                      label: "Run AI Audit",
                      onClick: runStrategy,
                      icon: Sparkles,
                    }}
                  />
                </ContentCard>
              )}
            </div>

            <div className="space-y-4">
              <ContentCard>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-secondary-950">Learning Loop</h3>
                    <p className="text-xs text-secondary-500">
                      Brand Brain {"->"} Strategy {"->"} Create {"->"} Measure {"->"} Learn
                    </p>
                  </div>
                  <Badge variant="primary">Active</Badge>
                </div>
                <div className="space-y-4">
                  <ScoreBar label="Brand Memory Completion" value={summary?.brandCompletion ?? 0} />
                  <ScoreBar
                    label="Connected Account Coverage"
                    value={Math.min(100, (summary?.activeAccounts || 0) * 20)}
                    helper={`${summary?.activeAccounts || 0} active profiles connected`}
                  />
                  <ScoreBar
                    label="Strategy Data Depth"
                    value={Math.min(100, (summary?.publishedPosts || 0) * 8)}
                    helper={`${summary?.publishedPosts || 0} published posts available for learning`}
                  />
                </div>
              </ContentCard>

              <ContentCard>
                <h3 className="mb-3 font-semibold text-secondary-950">Recent Signals</h3>
                {overview?.recentLearning?.length ? (
                  <div className="space-y-3">
                    {overview.recentLearning.slice(0, 5).map((event) => (
                      <div key={event.id} className="border-b border-secondary-100 pb-3 last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-secondary-900">{humanize(event.event_type)}</p>
                        <p className="mt-0.5 text-xs text-secondary-500">
                          {event.source} · {formatDistanceToNow(new Date(event.occurred_at))} ago
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-500">Learning signals will appear after creation, publishing, sync, and approvals.</p>
                )}
              </ContentCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <ContentCard>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-950">Brand Brain</h2>
                  <p className="mt-1 text-sm text-secondary-500">The user-controlled memory Xocial AI uses across strategy, creation, scoring, and reports.</p>
                </div>
                <Button onClick={saveBrandBrain} disabled={savingBrand} className="gap-2">
                  {savingBrand ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  Save Brain
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-secondary-800">Brand Voice</span>
                  <Textarea
                    value={brandDraft.voice}
                    onChange={(event) => setBrandDraft((draft) => ({ ...draft, voice: event.target.value }))}
                    placeholder="Direct, founder-led, practical, warm, high-conviction..."
                    rows={3}
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-secondary-800">Audience</span>
                  <Textarea
                    value={brandDraft.audience}
                    onChange={(event) => setBrandDraft((draft) => ({ ...draft, audience: event.target.value }))}
                    placeholder="Who the content is for, what they care about, and what language they use."
                    rows={3}
                  />
                </label>
                <TextListField
                  label="Products / Offers"
                  value={brandDraft.productsText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, productsText: value }))}
                  placeholder="One offer per line"
                />
                <TextListField
                  label="Content Pillars"
                  value={brandDraft.pillarsText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, pillarsText: value }))}
                  placeholder="Education, proof, behind the scenes, launches..."
                />
                <TextListField
                  label="Do Rules"
                  value={brandDraft.doRulesText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, doRulesText: value }))}
                  placeholder={"Use short hooks\nPrefer concrete examples"}
                />
                <TextListField
                  label="Do Not Rules"
                  value={brandDraft.dontRulesText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, dontRulesText: value }))}
                  placeholder={"Avoid vague hype\nDo not mention discounts"}
                />
                <TextListField
                  label="Approved Examples"
                  value={brandDraft.approvedText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, approvedText: value }))}
                  placeholder="Paste approved posts or client-approved phrasing"
                />
                <TextListField
                  label="Rejected Examples"
                  value={brandDraft.rejectedText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, rejectedText: value }))}
                  placeholder="Paste rejected content and patterns to avoid"
                />
                <TextListField
                  label="Competitors"
                  value={brandDraft.competitorsText}
                  onChange={(value) => setBrandDraft((draft) => ({ ...draft, competitorsText: value }))}
                  placeholder="Competitor names, handles, or positioning notes"
                  rows={3}
                />
              </div>
            </ContentCard>

            <div className="space-y-4">
              <ContentCard>
                <h3 className="font-semibold text-secondary-950">Memory Quality</h3>
                <div className="mt-4 space-y-4">
                  <ScoreBar label="Completion" value={summary?.brandCompletion ?? 0} />
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                    <p className="text-sm font-medium text-secondary-900">AI updates need approval</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary-500">
                      Workers can propose Brand Brain changes from approvals, edits, and performance. They do not silently rewrite brand memory.
                    </p>
                  </div>
                </div>
              </ContentCard>
              <ContentCard>
                <h3 className="font-semibold text-secondary-950">Knowledge Sources</h3>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ["Published posts", true],
                    ["Analytics sync", true],
                    ["Approvals", true],
                    ["Comments", true],
                    ["Uploaded documents", false],
                  ].map(([label, active]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3">
                      <span className="text-secondary-700">{label}</span>
                      <Badge variant={active ? "success" : "default"}>{active ? "Learning" : "Next"}</Badge>
                    </div>
                  ))}
                </div>
              </ContentCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
            <div className="space-y-4">
              <SectionTitle
                title="Strategy Recommendations"
                description="Recommendations are generated from Brand Brain, published posts, platform results, and active blockers."
              />
              {overview?.recommendations?.length ? (
                <div className="space-y-3">
                  {overview.recommendations.map((recommendation) => (
                    <ContentCard key={recommendation.id} hover>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="primary">{humanize(recommendation.type)}</Badge>
                            <Badge variant={priorityVariant(recommendation.priority)}>
                              {recommendation.priority}
                            </Badge>
                            <span className="text-xs text-secondary-500">
                              {Math.round(Number(recommendation.confidence_score || 0) * 100)}% confidence
                            </span>
                          </div>
                          <h3 className="mt-3 font-semibold text-secondary-950">{recommendation.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-secondary-600">{recommendation.description}</p>
                          {recommendation.action_items?.length ? (
                            <div className="mt-4 space-y-2">
                              {recommendation.action_items.slice(0, 4).map((item, index) => (
                                <div key={`${recommendation.id}-${index}`} className="flex gap-2 text-sm text-secondary-700">
                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-500" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => performRecommendationAction(recommendation.id, "recommendation_dismiss")}
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => performRecommendationAction(recommendation.id, "recommendation_accept")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => performRecommendationAction(recommendation.id, "recommendation_complete")}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </ContentCard>
                  ))}
                </div>
              ) : (
                <ContentCard>
                  <EmptyState
                    icon={ListChecks}
                    title="No strategy recommendations yet"
                    description="Generate strategy after publishing posts or completing Brand Brain."
                    action={{
                      label: "Generate Strategy",
                      onClick: runStrategy,
                      icon: Sparkles,
                    }}
                  />
                </ContentCard>
              )}
            </div>

            <div className="space-y-4">
              <ContentCard>
                <h3 className="font-semibold text-secondary-950">Strategy Workers</h3>
                <div className="mt-4 space-y-3">
                  {STRATEGY_WORKERS.map(({ agentType, label, icon: Icon }) => (
                    <Button
                      key={agentType}
                      variant="outline"
                      className="w-full justify-between"
                      disabled={taskLoading === agentType}
                      onClick={() => queueAgentTask(agentType, label)}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      {taskLoading === agentType ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </ContentCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <ContentCard className="lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-950">Trend Intelligence</h2>
                  <p className="mt-1 text-sm text-secondary-500">Trend analysis will combine platform signals, audience language, comments, hashtags, and top posts.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => queueAgentTask("performance_analyst", "Trend Analysis")}
                  disabled={taskLoading === "performance_analyst"}
                  className="gap-2"
                >
                  {taskLoading === "performance_analyst" ? <Spinner className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  Analyze
                </Button>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[
                  ["Winning formats", "Identify post types currently outperforming your baseline."],
                  ["Audience language", "Extract phrases and objections from comments and replies."],
                  ["Content gaps", "Find missing pillars, platforms, and campaign angles."],
                  ["Account risks", "Flag publishing failures, stale tokens, or sync gaps."],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-lg border border-secondary-200 p-4">
                    <h3 className="font-medium text-secondary-950">{title}</h3>
                    <p className="mt-1 text-sm text-secondary-500">{description}</p>
                  </div>
                ))}
              </div>
            </ContentCard>
            <ContentCard>
              <h3 className="font-semibold text-secondary-950">Signal Sources</h3>
              <div className="mt-4 space-y-3">
                {Object.entries(learning?.sources || {}).map(([source, active]) => (
                  <div key={source} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-secondary-700">{humanize(source)}</span>
                    <Badge variant={active ? "success" : "default"}>{active ? "On" : "Off"}</Badge>
                  </div>
                ))}
              </div>
            </ContentCard>
          </div>
        </TabsContent>

        <TabsContent value="predict" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <ContentCard>
              <h2 className="text-lg font-semibold text-secondary-950">Engagement Predictor</h2>
              <p className="mt-1 text-sm text-secondary-500">Score draft content before it enters the create workflow.</p>
              <div className="mt-5 space-y-4">
                <Textarea
                  value={predictionContent}
                  onChange={(event) => setPredictionContent(event.target.value)}
                  placeholder="Paste a draft caption, video description, or launch message..."
                  rows={8}
                />
                <PlatformToggles selected={predictionPlatforms} onChange={setPredictionPlatforms} />
                <Button
                  onClick={runPrediction}
                  disabled={predicting || predictionContent.trim().length < 10}
                  className="gap-2"
                >
                  {predicting ? <Spinner className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                  Score Content
                </Button>
              </div>
            </ContentCard>

            <ContentCard>
              <h3 className="font-semibold text-secondary-950">Prediction Result</h3>
              {prediction ? (
                <div className="mt-5 space-y-5">
                  <ScoreBar label="Overall" value={prediction.score.overall} />
                  <ScoreBar label="Brand Fit" value={prediction.score.brandFit} />
                  <ScoreBar label="Engagement Potential" value={prediction.score.engagementPotential} />
                  <ScoreBar label="Safety" value={prediction.score.safety} />
                  <div className="space-y-3">
                    {Object.entries(prediction.score.platformFit).map(([platform, score]) => (
                      <ScoreBar key={platform} label={`${humanize(platform)} Fit`} value={score || 0} />
                    ))}
                  </div>
                  {prediction.score.blockers.length ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-medium text-red-800">Blockers</p>
                      <ul className="mt-2 space-y-1 text-sm text-red-700">
                        {prediction.score.blockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                    <p className="text-sm font-medium text-secondary-900">Suggestions</p>
                    <ul className="mt-2 space-y-1 text-sm text-secondary-600">
                      {prediction.score.suggestions.length
                        ? prediction.score.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)
                        : <li>Content is ready for the selected platforms.</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <EmptyState
                    icon={Target}
                    title="No prediction yet"
                    description="Paste content and select platforms to see a brand and platform score."
                  />
                </div>
              )}
            </ContentCard>
          </div>
        </TabsContent>

        <TabsContent value="hashtags" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <ContentCard>
              <h2 className="text-lg font-semibold text-secondary-950">Hashtag Generator</h2>
              <p className="mt-1 text-sm text-secondary-500">Generate platform-specific discovery tags from the draft, topic, or campaign angle.</p>
              <div className="mt-5 space-y-4">
                <Textarea
                  value={hashtagContent}
                  onChange={(event) => setHashtagContent(event.target.value)}
                  placeholder="Paste the post, campaign topic, or audience problem..."
                  rows={7}
                />
                <Select
                  options={PLATFORM_OPTIONS.map((platform) => ({
                    value: platform.value,
                    label: platform.label,
                  }))}
                  value={hashtagPlatform}
                  onChange={(value) => setHashtagPlatform(value as Platform)}
                />
                <Button
                  onClick={generateHashtagSet}
                  disabled={hashtagLoading || hashtagContent.trim().length < 5}
                  className="gap-2"
                >
                  {hashtagLoading ? <Spinner className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                  Generate Hashtags
                </Button>
              </div>
            </ContentCard>
            <ContentCard>
              <h3 className="font-semibold text-secondary-950">Suggested Set</h3>
              {hashtags.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {hashtags.map((hashtag) => (
                    <Badge key={hashtag} variant="primary" className="text-sm">
                      #{hashtag.replace(/^#/, "")}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="mt-8">
                  <EmptyState
                    icon={Hash}
                    title="No hashtag set yet"
                    description="Generate a set and use it inside the Create screen."
                  />
                </div>
              )}
            </ContentCard>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {REPORT_WORKERS.map((report) => {
              const Icon = report.icon;
              return (
              <ContentCard key={report.title} hover>
                <div className="w-fit rounded-lg bg-primary-50 p-2 text-primary-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-secondary-950">{report.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary-500">{report.description}</p>
                <Button
                  className="mt-5 w-full gap-2"
                  variant="outline"
                  disabled={taskLoading === report.agent}
                  onClick={() => queueAgentTask(report.agent, report.title)}
                >
                  {taskLoading === report.agent ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  Queue Report
                </Button>
              </ContentCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="learning" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ContentCard>
              <h2 className="text-lg font-semibold text-secondary-950">AI Learning Feed</h2>
              <p className="mt-1 text-sm text-secondary-500">Every AI action, post event, publish result, metric sync, and approval signal becomes structured learning data.</p>
              <div className="mt-5 space-y-3">
                {learning?.events?.length ? (
                  learning.events.map((event) => (
                    <div key={event.id} className="rounded-lg border border-secondary-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{event.source}</Badge>
                          <h3 className="font-medium text-secondary-950">{humanize(event.event_type)}</h3>
                          {event.platform && <Badge variant="default">{event.platform}</Badge>}
                        </div>
                        <span className="text-xs text-secondary-500">
                          {formatDistanceToNow(new Date(event.occurred_at))} ago
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-secondary-500">
                        {event.entity_type ? `Linked to ${humanize(event.entity_type)}` : "Workspace-level signal"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No learning events yet"
                    description="Events will appear as users create, publish, approve, sync metrics, and use AI."
                  />
                )}
              </div>
            </ContentCard>

            <div className="space-y-4">
              <ContentCard>
                <h3 className="font-semibold text-secondary-950">AI Artifacts</h3>
                <div className="mt-4 space-y-3">
                  {learning?.artifacts?.length ? (
                    learning.artifacts.slice(0, 6).map((artifact) => {
                      const id = String(artifact.id || "");
                      const artifactType = String(artifact.artifact_type || "artifact");
                      const status = String(artifact.status || "active");
                      const isBrandSuggestion = artifactType === "brand_suggestion" && status === "active";
                      const brandPayload = asBrandSuggestionPayload(artifact);
                      const brandField = getBrandSuggestionField(artifact);
                      const evidence = evidenceItems(brandPayload);
                      return (
                        <div key={id} className="rounded-lg border border-secondary-200 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="primary">{humanize(artifactType)}</Badge>
                            <Badge variant={status === "active" ? "success" : "default"}>{humanize(status)}</Badge>
                            {isBrandSuggestion && brandField && (
                              <Badge variant="outline">{BRAND_FIELD_LABELS[brandField]}</Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-secondary-900">
                            {String(artifact.title || "AI artifact")}
                          </p>
                          {artifact.summary ? (
                            <p className="mt-1 text-xs leading-relaxed text-secondary-500">
                              {String(artifact.summary)}
                            </p>
                          ) : null}
                          {isBrandSuggestion && brandField && (
                            <div className="mt-3 rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">
                                Suggested update
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-secondary-800">
                                {suggestionValueToText(brandPayload.suggestedValue, brandField) || "No suggested value attached."}
                              </p>
                              {evidence.length ? (
                                <p className="mt-2 text-xs text-secondary-500">
                                  Evidence: {evidence.slice(0, 2).join(" · ")}
                                </p>
                              ) : null}
                            </div>
                          )}
                          {isBrandSuggestion && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="gap-2"
                                disabled={artifactLoading === id}
                                onClick={() => setReviewingBrandArtifact(artifact)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Review & Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={artifactLoading === id}
                                onClick={() => performArtifactAction(id, "artifact_ignore")}
                              >
                                Ignore
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-secondary-500">Worker outputs will appear here after queued tasks run.</p>
                  )}
                </div>
              </ContentCard>
              <ContentCard>
                <h3 className="font-semibold text-secondary-950">Signal Counts</h3>
                <div className="mt-4 space-y-3">
                  {Object.keys(learning?.sourceCounts || {}).length ? (
                    Object.entries(learning?.sourceCounts || {}).map(([eventType, count]) => (
                      <div key={eventType} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-secondary-700">{humanize(eventType)}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-secondary-500">No counted signals yet.</p>
                  )}
                </div>
              </ContentCard>
              <ContentCard>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-secondary-950">Worker Queue</h3>
                    <p className="mt-1 text-xs text-secondary-500">
                      Queue specialist workers, then process due tasks immediately during development.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={processDueWorkers}
                    disabled={processingWorkers}
                    className="gap-2"
                  >
                    {processingWorkers ? <Spinner className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                    Process Due
                  </Button>
                </div>
                <div className="mt-4 grid gap-2">
                  {LEARNING_WORKERS.map(({ agent, label }) => (
                    <Button
                      key={agent}
                      variant="outline"
                      className="justify-between"
                      disabled={taskLoading === agent}
                      onClick={() => queueAgentTask(agent, label)}
                    >
                      {label}
                      {taskLoading === agent ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
                {failedWorkerTasks.length ? (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">
                          {failedWorkerTasks.length} worker{failedWorkerTasks.length === 1 ? "" : "s"} need attention
                        </p>
                        <div className="mt-2 space-y-2">
                          {failedWorkerTasks.slice(0, 3).map((task) => (
                            <div key={String(task.id)} className="text-xs leading-relaxed text-red-800">
                              <span className="font-medium">{humanize(String(task.agent_type || "worker"))}:</span>{" "}
                              {task.error_message || "No error message returned."}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {learning?.tasks?.length ? (
                  <div className="mt-5 space-y-3 border-t border-secondary-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">Recent worker runs</p>
                    {learning.tasks.slice(0, 8).map((task) => {
                      const status = String(task.status || "queued");
                      const runtime = taskRuntime(task);
                      return (
                        <div key={String(task.id)} className="rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-secondary-900">
                                {humanize(String(task.agent_type || "worker"))}
                              </p>
                              <p className="mt-1 text-xs text-secondary-500">
                                {task.finished_at
                                  ? `Finished ${relativeTime(task.finished_at)}`
                                  : task.started_at
                                    ? `Started ${relativeTime(task.started_at)}`
                                    : task.scheduled_for
                                      ? `Scheduled ${relativeTime(task.scheduled_for)}`
                                      : `Queued ${relativeTime(task.created_at)}`}
                                {runtime ? ` · ${runtime}` : ""}
                                {Number(task.retry_count || 0) > 0 ? ` · retry ${task.retry_count}` : ""}
                              </p>
                            </div>
                            <Badge variant={workerStatusVariant(status)}>{humanize(status)}</Badge>
                          </div>
                          {task.error_message ? (
                            <p className="mt-2 rounded-md border border-red-100 bg-white px-2 py-1.5 text-xs leading-relaxed text-red-700">
                              {task.error_message}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 border-t border-secondary-100 pt-4">
                    <p className="text-sm text-secondary-500">
                      Queue a worker to start building the learning loop.
                    </p>
                  </div>
                )}
              </ContentCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <BrandSuggestionReviewDialog
        artifact={reviewingBrandArtifact}
        brandProfile={overview?.brandProfile}
        open={!!reviewingBrandArtifact}
        onOpenChange={(open) => {
          if (!open) setReviewingBrandArtifact(null);
        }}
        loading={Boolean(reviewingBrandArtifact?.id && artifactLoading === reviewingBrandArtifact.id)}
        onAccept={(artifactId, payload) => performArtifactAction(artifactId, "artifact_accept", payload)}
        onIgnore={(artifactId) => performArtifactAction(artifactId, "artifact_ignore")}
      />
    </PageContainer>
  );
}
