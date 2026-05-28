"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Edit3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AIFeedbackActionType, AIFeedbackReasonType } from "@/types/intelligence";

const FEEDBACK_REASONS: Array<{ value: AIFeedbackReasonType; label: string }> = [
  { value: "off_brand", label: "Off-brand" },
  { value: "wrong_audience", label: "Wrong audience" },
  { value: "wrong_platform", label: "Wrong platform" },
  { value: "weak_evidence", label: "Weak evidence" },
  { value: "client_preference", label: "Client preference" },
  { value: "inaccurate", label: "Inaccurate" },
  { value: "already_handled", label: "Already handled" },
  { value: "not_useful", label: "Not useful" },
  { value: "other", label: "Other" },
];

function actionTitle(action: AIFeedbackActionType) {
  if (action === "edit_accept") return "Edit and accept";
  if (action === "mark_off_brand") return "Mark as off-brand";
  if (action === "reject") return "Reject AI suggestion";
  if (action === "ignore" || action === "dismiss") return "Ignore suggestion";
  return "Save AI feedback";
}

function actionDescription(action: AIFeedbackActionType) {
  if (action === "edit_accept") {
    return "Adjust the suggestion before Xocial treats your version as the accepted signal.";
  }
  if (action === "mark_off_brand") {
    return "This feedback can update Brand Brain so future output avoids the same pattern.";
  }
  if (action === "reject" || action === "ignore" || action === "dismiss") {
    return "Explain why this was not useful so Xocial can reduce similar recommendations.";
  }
  return "This decision becomes part of the learning loop.";
}

export function FeedbackDialog({
  open,
  onOpenChange,
  action,
  title,
  originalText,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AIFeedbackActionType;
  title: string;
  originalText?: string;
  loading?: boolean;
  onSubmit: (payload: {
    reasonType?: AIFeedbackReasonType;
    comment?: string;
    editedText?: string;
    applyToBrandBrain?: boolean;
  }) => Promise<void> | void;
}) {
  const [reasonType, setReasonType] = useState<AIFeedbackReasonType>(
    action === "mark_off_brand" ? "off_brand" : "not_useful"
  );
  const [comment, setComment] = useState("");
  const [editedText, setEditedText] = useState("");
  const [applyToBrandBrain, setApplyToBrandBrain] = useState(action === "mark_off_brand");
  const showEdit = action === "edit_accept";
  const needsComment = action === "mark_off_brand" || action === "reject" || action === "ignore" || action === "dismiss";

  useEffect(() => {
    if (!open) return;
    setReasonType(action === "mark_off_brand" ? "off_brand" : "not_useful");
    setComment("");
    setEditedText(originalText || "");
    setApplyToBrandBrain(action === "mark_off_brand");
  }, [action, open, originalText]);

  const submit = async () => {
    await onSubmit({
      reasonType,
      comment: comment.trim(),
      editedText: showEdit ? editedText : undefined,
      applyToBrandBrain,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={action === "mark_off_brand" ? "error" : "primary"}>
              {action === "mark_off_brand" ? "Brand feedback" : "Learning feedback"}
            </Badge>
          </div>
          <DialogTitle>{actionTitle(action)}</DialogTitle>
          <DialogDescription>{actionDescription(action)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">Feedback target</p>
            <p className="mt-1 text-sm font-medium text-secondary-900">{title || "Xocial AI item"}</p>
          </div>

          {showEdit ? (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-secondary-800">
                <Edit3 className="h-4 w-4" />
                Accepted version
              </span>
              <Textarea
                value={editedText}
                onChange={(event) => setEditedText(event.target.value)}
                rows={7}
                placeholder="Edit the suggestion before accepting it."
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-secondary-800">Reason</span>
            <Select
              options={FEEDBACK_REASONS}
              value={reasonType}
              onChange={(value) => setReasonType(value as AIFeedbackReasonType)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-secondary-800">
              What should Xocial learn?
            </span>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder={
                action === "mark_off_brand"
                  ? "Example: Too salesy. Keep this brand practical and founder-led."
                  : "Example: This is already handled, or the recommendation misses the client objective."
              }
            />
          </label>

          {action === "mark_off_brand" ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-secondary-200 bg-secondary-50 p-3 text-sm text-secondary-700">
              <input
                type="checkbox"
                checked={applyToBrandBrain}
                onChange={(event) => setApplyToBrandBrain(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-secondary-300 text-primary-600"
              />
              <span>
                Update Brand Brain with this off-brand signal so future strategy and generation avoid it.
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={Boolean(loading) || (needsComment && !comment.trim()) || (showEdit && !editedText.trim())}
            className="gap-2"
          >
            {loading ? (
              <Spinner className="h-4 w-4" />
            ) : action === "mark_off_brand" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
