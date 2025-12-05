"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WorkspaceFormProps {
    workspace: any;
    onUpdate: () => void;
}

export function WorkspaceForm({ workspace, onUpdate }: WorkspaceFormProps) {
    const [saving, setSaving] = useState(false);
    const [workspaceName, setWorkspaceName] = useState(workspace?.name || "");
    const supabase = createClient();

    const handleWorkspaceUpdate = useCallback(async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            if (workspace) {
                // Update existing workspace
                const { error } = await supabase
                    .from("workspaces")
                    .update({
                        name: workspaceName,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", workspace.id);

                if (error) throw error;
                toast.success("Workspace updated successfully!");
            } else {
                // Create new workspace
                const { error } = await supabase
                    .from("workspaces")
                    .insert({
                        name: workspaceName,
                        slug: workspaceName.toLowerCase().replace(/\s+/g, "-"),
                        owner_id: user.id,
                    });

                if (error) throw error;
                toast.success("Workspace created successfully!");
            }

            onUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to update workspace");
        } finally {
            setSaving(false);
        }
    }, [supabase, workspace, workspaceName, onUpdate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>
                    Manage your workspace configuration
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Workspace Name
                    </label>
                    <Input
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="My Workspace"
                    />
                </div>

                {workspace && (
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Workspace ID
                        </label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={workspace.slug}
                                disabled
                                className="bg-secondary-50"
                            />
                            <Badge variant="info">Active</Badge>
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleWorkspaceUpdate}
                    disabled={saving || !workspaceName.trim()}
                    className="w-full"
                >
                    {saving ? "Saving..." : workspace ? "Update Workspace" : "Create Workspace"}
                </Button>
            </CardContent>
        </Card>
    );
}
