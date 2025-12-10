"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GitBranch, Check, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Workflow {
    id: string;
    name: string;
    description: string | null;
    type: string;
    is_default: boolean;
    steps: {
        id: string;
        step_order: number;
        required_role: string | null;
        approval_rule: string;
    }[];
}

interface WorkflowSelectorProps {
    workspaceId: string;
    selectedWorkflowId?: string;
    onSelect: (workflowId: string | null) => void;
    disabled?: boolean;
    compact?: boolean;
}

export function WorkflowSelector({
    workspaceId,
    selectedWorkflowId,
    onSelect,
    disabled = false,
    compact = false,
}: WorkflowSelectorProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const fetchWorkflows = useCallback(async () => {
        if (!workspaceId) return;

        try {
            const res = await fetch(`/api/workflows?workspace_id=${workspaceId}`);
            const data = await res.json();
            setWorkflows(data.workflows || []);
        } catch (error) {
            console.error("Failed to fetch workflows:", error);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
    const defaultWorkflow = workflows.find((w) => w.is_default);

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case "owner":
                return "Owner";
            case "admin":
                return "Admin";
            case "manager":
                return "Manager";
            default:
                return "Any";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-secondary-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading workflows...
            </div>
        );
    }

    if (workflows.length === 0) {
        return (
            <div className="text-sm text-secondary-500">
                No approval workflows configured.{" "}
                <a href="/settings/workflows" className="text-primary-600 hover:underline">
                    Create one
                </a>
            </div>
        );
    }

    if (compact) {
        return (
            <Select
                value={selectedWorkflowId || "none"}
                onValueChange={(value) => onSelect(value === "none" ? null : value)}
                disabled={disabled}
            >
                <SelectTrigger className="w-[200px] h-8 text-sm">
                    <GitBranch className="h-3.5 w-3.5 mr-2 text-secondary-500" />
                    <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No approval needed</SelectItem>
                    {workflows.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                            {workflow.name}
                            {workflow.is_default && " (Default)"}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={disabled}
                >
                    <GitBranch className="h-4 w-4" />
                    {selectedWorkflow ? selectedWorkflow.name : "Select Workflow"}
                    {selectedWorkflow?.is_default && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Default
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Select Approval Workflow</DialogTitle>
                    <DialogDescription>
                        Choose how this content should be reviewed before publishing.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {/* No approval option */}
                    <button
                        className={cn(
                            "w-full p-3 rounded-lg border text-left transition-all",
                            !selectedWorkflowId
                                ? "border-primary-500 bg-primary-50"
                                : "border-secondary-200 hover:border-secondary-300"
                        )}
                        onClick={() => {
                            onSelect(null);
                            setIsOpen(false);
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-medium text-secondary-900">
                                    No Approval Required
                                </span>
                                <p className="text-sm text-secondary-500 mt-0.5">
                                    Publish or schedule directly without review
                                </p>
                            </div>
                            {!selectedWorkflowId && (
                                <Check className="h-5 w-5 text-primary-600" />
                            )}
                        </div>
                    </button>

                    {/* Workflow options */}
                    {workflows.map((workflow) => (
                        <button
                            key={workflow.id}
                            className={cn(
                                "w-full p-3 rounded-lg border text-left transition-all",
                                selectedWorkflowId === workflow.id
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-secondary-200 hover:border-secondary-300"
                            )}
                            onClick={() => {
                                onSelect(workflow.id);
                                setIsOpen(false);
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-secondary-900">
                                            {workflow.name}
                                        </span>
                                        {workflow.is_default && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    {workflow.description && (
                                        <p className="text-sm text-secondary-500 mt-0.5">
                                            {workflow.description}
                                        </p>
                                    )}
                                    {/* Steps visualization */}
                                    <div className="flex items-center gap-1 mt-2">
                                        {workflow.steps.map((step, idx) => (
                                            <div key={step.id} className="flex items-center">
                                                <span className="px-2 py-0.5 text-xs bg-secondary-100 rounded">
                                                    {getRoleLabel(step.required_role)}
                                                </span>
                                                {idx < workflow.steps.length - 1 && (
                                                    <ChevronRight className="h-3 w-3 text-secondary-400 mx-1" />
                                                )}
                                            </div>
                                        ))}
                                        {workflow.steps.length === 0 && (
                                            <span className="text-xs text-secondary-400">
                                                No steps configured
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {selectedWorkflowId === workflow.id && (
                                    <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
