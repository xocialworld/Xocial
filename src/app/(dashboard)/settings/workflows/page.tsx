"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
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
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";
import {
    Plus,
    Trash2,
    Edit2,
    GitBranch,
    Check,
    Users,
    Star,
    Loader2,
    ArrowRight,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
    id?: string;
    step_order: number;
    required_role: string | null;
    required_users: string[];
    approval_rule: "any" | "all";
}

interface Workflow {
    id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    type: "single_step" | "sequential" | "parallel";
    is_default: boolean;
    steps: WorkflowStep[];
    created_at: string;
}

export default function WorkflowsSettingsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formType, setFormType] = useState<"single_step" | "sequential" | "parallel">("sequential");
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [formSteps, setFormSteps] = useState<WorkflowStep[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchWorkspaceId = useCallback(async () => {
        try {
            const res = await fetch('/api/workspaces');
            const data = await res.json();
            if (data.workspaces && data.workspaces.length > 0) {
                setWorkspaceId(data.workspaces[0].id);
            }
        } catch (error) {
            console.error('Failed to get workspace:', error);
        }
    }, []);

    useEffect(() => {
        fetchWorkspaceId();
    }, [fetchWorkspaceId]);

    const fetchWorkflows = useCallback(async () => {
        if (!workspaceId) return;

        try {
            const res = await fetch(`/api/workflows?workspace_id=${workspaceId}`);
            const data = await res.json();
            setWorkflows(data.workflows || []);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
            toast.error('Failed to load workflows');
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (workspaceId) {
            fetchWorkflows();
        }
    }, [workspaceId, fetchWorkflows]);

    const resetForm = () => {
        setFormName("");
        setFormDescription("");
        setFormType("sequential");
        setFormIsDefault(false);
        setFormSteps([{ step_order: 1, required_role: "manager", required_users: [], approval_rule: "any" }]);
        setEditingWorkflow(null);
    };

    const openEditDialog = (workflow: Workflow) => {
        setEditingWorkflow(workflow);
        setFormName(workflow.name);
        setFormDescription(workflow.description || "");
        setFormType(workflow.type);
        setFormIsDefault(workflow.is_default);
        setFormSteps(workflow.steps.length > 0 ? workflow.steps : [
            { step_order: 1, required_role: "manager", required_users: [], approval_rule: "any" }
        ]);
        setIsCreateOpen(true);
    };

    const handleSubmit = async () => {
        if (!formName.trim() || !workspaceId) return;

        setSaving(true);
        try {
            const url = editingWorkflow ? `/api/workflows/${editingWorkflow.id}` : '/api/workflows';
            const method = editingWorkflow ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    name: formName.trim(),
                    description: formDescription.trim() || null,
                    type: formType,
                    is_default: formIsDefault,
                    steps: formSteps,
                }),
            });

            const data = await res.json();

            if (res.ok && data.workflow) {
                toast.success(editingWorkflow ? 'Workflow updated' : 'Workflow created');
                setIsCreateOpen(false);
                resetForm();
                fetchWorkflows();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (workflowId: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;

        try {
            const res = await fetch(`/api/workflows/${workflowId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Workflow deleted');
                fetchWorkflows();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete workflow');
            }
        } catch (error) {
            toast.error('Failed to delete workflow');
        }
    };

    const addStep = () => {
        setFormSteps([
            ...formSteps,
            {
                step_order: formSteps.length + 1,
                required_role: "manager",
                required_users: [],
                approval_rule: "any",
            },
        ]);
    };

    const removeStep = (index: number) => {
        if (formSteps.length <= 1) return;
        const newSteps = formSteps.filter((_, i) => i !== index);
        setFormSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })));
    };

    const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
        setFormSteps(formSteps.map((step, i) =>
            i === index ? { ...step, ...updates } : step
        ));
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'single_step': return 'Single Step';
            case 'sequential': return 'Sequential';
            case 'parallel': return 'Parallel';
            default: return type;
        }
    };

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case 'owner': return 'Owner';
            case 'admin': return 'Admin';
            case 'manager': return 'Manager';
            case 'creator': return 'Creator';
            default: return role || 'Any';
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <PageHeader
                    title="Approval Workflows"
                    description="Configure approval processes for your content"
                    breadcrumbs={[
                        { label: "Settings", href: "/settings" },
                        { label: "Workflows" },
                    ]}
                />
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <PageHeader
                title="Approval Workflows"
                description="Configure approval processes for your content"
                breadcrumbs={[
                    { label: "Settings", href: "/settings" },
                    { label: "Workflows" },
                ]}
                actions={
                    <Dialog open={isCreateOpen} onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Workflow
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingWorkflow ? 'Edit Workflow' : 'Create Approval Workflow'}
                                </DialogTitle>
                                <DialogDescription>
                                    Define the approval steps required before content can be published.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                {/* Basic Info */}
                                <div className="grid gap-4">
                                    <div>
                                        <Label htmlFor="name">Workflow Name</Label>
                                        <Input
                                            id="name"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            placeholder="e.g., Client Approval"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Description (optional)</Label>
                                        <Textarea
                                            id="description"
                                            value={formDescription}
                                            onChange={(e) => setFormDescription(e.target.value)}
                                            placeholder="Describe when to use this workflow"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Workflow Type</Label>
                                            <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="single_step">Single Step</SelectItem>
                                                    <SelectItem value="sequential">Sequential</SelectItem>
                                                    <SelectItem value="parallel">Parallel</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formIsDefault}
                                                    onChange={(e) => setFormIsDefault(e.target.checked)}
                                                    className="rounded border-secondary-300"
                                                />
                                                <span className="text-sm">Set as default workflow</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Steps */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label>Approval Steps</Label>
                                        {formType !== 'single_step' && (
                                            <Button variant="outline" size="sm" onClick={addStep}>
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                                Add Step
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {formSteps.map((step, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg border bg-secondary-50"
                                            >
                                                <div className="flex-shrink-0">
                                                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                                                        {index + 1}
                                                    </Badge>
                                                </div>
                                                <div className="flex-1 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs">Required Role</Label>
                                                        <Select
                                                            value={step.required_role || "any"}
                                                            onValueChange={(v) => updateStep(index, { required_role: v === "any" ? null : v })}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="any">Any member</SelectItem>
                                                                <SelectItem value="owner">Owner</SelectItem>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="manager">Manager</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Approval Rule</Label>
                                                        <Select
                                                            value={step.approval_rule}
                                                            onValueChange={(v: any) => updateStep(index, { approval_rule: v })}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="any">Any one approver</SelectItem>
                                                                <SelectItem value="all">All must approve</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                {formSteps.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-secondary-400 hover:text-red-600"
                                                        onClick={() => removeStep(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} disabled={!formName.trim() || saving}>
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Workflows List */}
            <div className="grid gap-4 mt-6">
                {workflows.length === 0 ? (
                    <Card className="p-12 text-center">
                        <GitBranch className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-secondary-900 mb-2">
                            No workflows yet
                        </h3>
                        <p className="text-secondary-500 mb-4">
                            Create approval workflows to control content publishing
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Workflow
                        </Button>
                    </Card>
                ) : (
                    workflows.map((workflow) => (
                        <Card key={workflow.id} className={cn(
                            "hover:shadow-md transition-shadow",
                            workflow.is_default && "ring-2 ring-primary-200"
                        )}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{workflow.name}</CardTitle>
                                        {workflow.is_default && (
                                            <Badge className="bg-primary-100 text-primary-700">
                                                <Star className="h-3 w-3 mr-1" />
                                                Default
                                            </Badge>
                                        )}
                                        <Badge variant="outline">{getTypeLabel(workflow.type)}</Badge>
                                    </div>
                                    {workflow.description && (
                                        <CardDescription className="mt-1">{workflow.description}</CardDescription>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(workflow)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(workflow.id)}
                                        disabled={workflow.is_default}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    {workflow.steps.map((step, index) => (
                                        <div key={step.id || index} className="flex items-center">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-100">
                                                <Users className="h-3.5 w-3.5 text-secondary-500" />
                                                <span className="text-sm text-secondary-700">
                                                    Step {step.step_order}: {getRoleLabel(step.required_role)}
                                                </span>
                                                {step.approval_rule === 'all' && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0">All</Badge>
                                                )}
                                            </div>
                                            {index < workflow.steps.length - 1 && (
                                                <ArrowRight className="h-4 w-4 text-secondary-400 mx-2" />
                                            )}
                                        </div>
                                    ))}
                                    {workflow.steps.length === 0 && (
                                        <span className="text-sm text-secondary-400">No steps configured</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
