"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Loader2, Check, Copy, Users, Calendar, Link2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const [copied, setCopied] = useState(false);
    const supabase = createClient();

    // Reset form when workspace changes
    useEffect(() => {
        setWorkspaceName(workspace?.name || "");
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
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", workspace.id);

                if (error) throw error;
                toast.success("Workspace updated successfully!");
            } else {
                // Create new workspace
                const slug = workspaceName.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, '-');

                const { error } = await supabase
                    .from("workspaces")
                    .insert({
                        name: workspaceName.trim(),
                        slug,
                        owner_id: user.id,
                    });

                if (error) throw error;
                toast.success("Workspace created successfully!");
            }

            setSaved(true);
            onUpdate();
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            toast.error(error.message || "Failed to update workspace");
        } finally {
            setSaving(false);
        }
    }, [supabase, workspace, workspaceName, onUpdate]);

    const copyWorkspaceId = () => {
        if (workspace?.id) {
            navigator.clipboard.writeText(workspace.id);
            setCopied(true);
            toast.success("Workspace ID copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const hasChanges = workspaceName !== (workspace?.name || "");

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
        </div>
    );
}
