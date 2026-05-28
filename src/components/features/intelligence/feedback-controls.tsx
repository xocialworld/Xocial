"use client";

import { useState } from "react";
import { AlertTriangle, Check, Edit3, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AIFeedbackActionType,
  AIFeedbackRequest,
  AIFeedbackTargetType,
} from "@/types/intelligence";
import { FeedbackDialog } from "./feedback-dialog";

type FeedbackControlAction = Extract<
  AIFeedbackActionType,
  "accept" | "edit_accept" | "ignore" | "dismiss" | "complete" | "apply" | "reject" | "mark_off_brand"
>;

const DIRECT_ACTIONS = new Set<AIFeedbackActionType>(["accept", "complete", "apply"]);

function actionLabel(action: FeedbackControlAction) {
  switch (action) {
    case "accept":
      return "Accept";
    case "edit_accept":
      return "Edit";
    case "ignore":
      return "Ignore";
    case "dismiss":
      return "Dismiss";
    case "complete":
      return "Done";
    case "apply":
      return "Apply";
    case "reject":
      return "Reject";
    case "mark_off_brand":
      return "Off-brand";
  }
}

function actionIcon(action: FeedbackControlAction) {
  if (action === "accept" || action === "complete" || action === "apply") return Check;
  if (action === "edit_accept") return Edit3;
  if (action === "mark_off_brand" || action === "reject") return AlertTriangle;
  return EyeOff;
}

function actionSuccess(action: FeedbackControlAction) {
  if (action === "mark_off_brand") return "Off-brand feedback saved";
  if (action === "edit_accept") return "Edited version accepted";
  if (action === "ignore" || action === "dismiss") return "Feedback saved";
  if (action === "reject") return "Rejection saved";
  if (action === "complete") return "Marked complete";
  return "AI feedback saved";
}

function withWorkspace(path: string, workspaceId?: string) {
  if (!workspaceId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function FeedbackControls({
  targetType,
  targetId,
  title,
  originalValue,
  originalText,
  metadata,
  workspaceId,
  actions = ["accept", "edit_accept", "ignore", "mark_off_brand"],
  size = "sm",
  className,
  disabled,
  onSubmitted,
}: {
  targetType: AIFeedbackTargetType;
  targetId?: string | null;
  title: string;
  originalValue?: AIFeedbackRequest["originalValue"];
  originalText?: string;
  metadata?: Record<string, unknown>;
  workspaceId?: string;
  actions?: FeedbackControlAction[];
  size?: "sm" | "default";
  className?: string;
  disabled?: boolean;
  onSubmitted?: (payload: unknown, action: FeedbackControlAction) => Promise<void> | void;
}) {
  const [activeAction, setActiveAction] = useState<FeedbackControlAction | null>(null);
  const [submittingAction, setSubmittingAction] = useState<FeedbackControlAction | null>(null);
  const dialogOpen = Boolean(activeAction && !DIRECT_ACTIONS.has(activeAction));

  const submitFeedback = async (
    action: FeedbackControlAction,
    payload: {
      reasonType?: string;
      comment?: string;
      editedText?: string;
      applyToBrandBrain?: boolean;
    } = {}
  ) => {
    setSubmittingAction(action);
    try {
      const body: AIFeedbackRequest = {
        targetType,
        targetId,
        action,
        reasonType: payload.reasonType,
        comment: payload.comment,
        originalValue,
        editedValue: payload.editedText
          ? { text: payload.editedText }
          : payload.comment || payload.reasonType
            ? { reasonType: payload.reasonType, comment: payload.comment }
            : undefined,
        applyToBrandBrain: payload.applyToBrandBrain,
        metadata: {
          title,
          originalText,
          ...(metadata || {}),
        },
      };
      const response = await fetch(withWorkspace("/api/intelligence/feedback", workspaceId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
        body: JSON.stringify(body),
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success === false) {
        throw new Error(responsePayload?.error?.message || "Unable to save AI feedback");
      }
      toast.success(actionSuccess(action));
      setActiveAction(null);
      await onSubmitted?.(responsePayload?.data, action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save AI feedback");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {actions.map((action) => {
          const Icon = actionIcon(action);
          const loading = submittingAction === action;
          const variant =
            action === "mark_off_brand" || action === "reject"
              ? "outline"
              : action === "accept" || action === "apply"
                ? "secondary"
                : "outline";
          return (
            <Button
              key={action}
              type="button"
              size={size}
              variant={variant}
              disabled={disabled || Boolean(submittingAction)}
              onClick={() => {
                if (DIRECT_ACTIONS.has(action)) {
                  void submitFeedback(action);
                } else {
                  setActiveAction(action);
                }
              }}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {actionLabel(action)}
            </Button>
          );
        })}
      </div>

      {activeAction ? (
        <FeedbackDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          action={activeAction}
          title={title}
          originalText={originalText}
          loading={submittingAction === activeAction}
          onSubmit={(payload) => submitFeedback(activeAction, payload)}
        />
      ) : null}
    </>
  );
}
