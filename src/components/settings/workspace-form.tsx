"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Loader2, Check, Copy, Users, Calendar, Link2, AlertCircle, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspaceStore";

interface WorkspaceFormProps {
    workspace: any;
    onUpdate: () => void;
}

function FormGroup({
    label,
    description,
    required = false,
    children
}: {
    label: string;
    description?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-medium text-secondary-900">
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {description && (
                <p className="text-xs text-secondary-500">{description}</p>
            )}
        </div>
    );
}

function StatItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Icon className="h-4 w-4 text-secondary-500" />
            </div>
            <div>
                <p className="text-xs text-secondary-500">{label}</p>
                <p className="text-sm font-semibold text-secondary-900">{value}</p>
            </div>
        </div>
    );
}

export function WorkspaceForm({ workspace, onUpdate }: WorkspaceFormProps) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [workspaceName, setWorkspaceName] = useState(workspace?.name || "");
    const [requireApproval, setRequireApproval] = useState(workspace?.settings?.require_approval || false);
    const [copied, setCopied] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const supabase = createClient();
    const router = useRouter();
    const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);

    // Reset form when workspace changes
    useEffect(() => {
        setWorkspaceName(workspace?.name || "");
        setRequireApproval(workspace?.settings?.require_approval || false);
    }, [workspace]);

    const handleWorkspaceUpdate = useCallback(async () => {
        if (!workspaceName.trim()) {
            toast.error("Workspace name is required");
            return;
        }

        setSaving(true);
        setSaved(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            if (workspace) {
                // Update existing workspace
                const { error } = await supabase
                    .from("workspaces")
                    .update({
                        name: workspaceName.trim(),
                        settings: {
                            ...workspace.settings,
                            require_approval: requireApproval
                        },
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", workspace.id);

                if (error) throw error;
                toast.success("Workspace updated successfully!");
            } else {
                // Create new workspace via API to ensure proper setup (memberships, etc.)
                const response = await fetch("/api/workspaces", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: workspaceName.trim(),
                        settings: {
                            require_approval: requireApproval
                        }
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(
                        errorData?.error?.message ||
                        errorData?.message ||
                        "Failed to create workspace"
                    );
                }

                toast.success("Workspace created successfully!");
            }

            setSaved(true);

            // Force stale to ensure switcher refreshes
            useWorkspaceStore.getState().invalidateWorkspaces();

            onUpdate();
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            toast.error(error.message || "Failed to update workspace");
        } finally {
            setSaving(false);
        }
    }, [supabase, workspace, workspaceName, onUpdate, requireApproval]);

    const copyWorkspaceId = () => {
        if (workspace?.id) {
            navigator.clipboard.writeText(workspace.id);
            setCopied(true);
            toast.success("Workspace ID copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!workspace?.id) return;

        try {
            const { error } = await supabase
                .from("workspaces")
                .delete()
                .eq("id", workspace.id);

            if (error) throw error;

            toast.success("Workspace deleted successfully");

            // Clear workspaces in store to force refresh or handling
            setWorkspaces([]);

            router.push("/settings/workspace/create");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete workspace");
        }
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, [supabase]);

    // Check for changes (name or settings)
    const hasChanges =
        workspaceName !== (workspace?.name || "") ||
        requireApproval !== (workspace?.settings?.require_approval || false);

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
                <h3 className="font-semibold text-secondary-900">Workspace Settings</h3>
                <p className="text-sm text-secondary-500 mt-1">
                    Configure your workspace details and preferences
                </p>
            </div>

            {/* Workspace Stats */}
            {workspace && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatItem icon={Users} label="Team Members" value={workspace.member_count || 1} />
                    <StatItem icon={Link2} label="Connected Accounts" value={workspace.account_count || 0} />
                    <StatItem icon={Calendar} label="Created" value={new Date(workspace.created_at).toLocaleDateString()} />
                </div>
            )}

            {/* Form Fields */}
            <FormGroup label="Workspace Name" required>
                <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <Input
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="My Workspace"
                        className="h-10 pl-10"
                    />
                </div>
            </FormGroup>

            {workspace && (
                <>
                    <FormGroup label="Workspace Slug" description="Used in URLs and API calls">
                        <Input
                            value={workspace.slug}
                            disabled
                            className="h-10 bg-secondary-50 text-secondary-500 font-mono text-sm"
                        />
                    </FormGroup>

                    <FormGroup label="Workspace ID" description="Unique identifier for API integrations">
                        <div className="flex gap-2">
                            <Input
                                value={workspace.id}
                                disabled
                                className="h-10 bg-secondary-50 text-secondary-500 font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyWorkspaceId}
                                className="h-10 px-3 flex-shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </FormGroup>

                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <Badge className="bg-blue-500 hover:bg-blue-600">Active</Badge>
                        <span className="text-sm text-blue-700">
                            This workspace is active and fully operational
                        </span>
                    </div>
                </>
            )}

            {!workspace && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">No workspace found</p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Create a workspace to start managing your social media accounts.
                        </p>
                    </div>
                </div>
            )}

            {/* Workflow Settings Section - Only show for teams */}
            {workspace && (workspace.member_count > 1) && (
                <div className="pt-6 border-t border-secondary-100 space-y-4">
                    <div className="pb-2">
                        <h3 className="font-medium text-secondary-900 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-secondary-500" />
                            Workflow Settings
                        </h3>
                        <p className="text-sm text-secondary-500 mt-1">
                            Manage approval requirements for your team members
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-secondary-200 rounded-lg">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium text-secondary-900">
                                Require Approval for Posts
                            </label>
                            <p className="text-xs text-secondary-500">
                                When enabled, Editors must request approval before publishing.
                                Only Admins and Owners can publish directly.
                            </p>
                        </div>
                        <Switch
                            checked={requireApproval}
                            onCheckedChange={setRequireApproval}
                        />
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                <div className="text-sm text-secondary-500">
                    {hasChanges && "You have unsaved changes"}
                </div>
                <Button
                    onClick={handleWorkspaceUpdate}
                    disabled={saving || !workspaceName.trim() || (!hasChanges && workspace)}
                    className="min-w-[140px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Saved!
                        </>
                    ) : workspace ? (
                        "Update Workspace"
                    ) : (
                        "Create Workspace"
                    )}
                </Button>
            </div>


            {/* Danger Zone */}
            {
                workspace && userId && workspace.owner_id === userId && (
                    <div className="border border-red-100 bg-red-50/50 rounded-xl p-5 mt-8">
                        <h3 className="font-medium text-red-900 mb-1">Danger Zone</h3>
                        <p className="text-sm text-red-600 mb-4">
                            Permanently delete this workspace and all associated data. This action cannot be undone.
                        </p>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteAlertOpen(true)}
                        >
                            Delete Workspace
                        </Button>
                        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the workspace
                                        <strong> {workspace.name} </strong>
                                        and remove all data associated with it.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteWorkspace}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Delete Workspace
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            }
        </div >
    );
}
