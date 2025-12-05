"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore } from "@/store/workspaceStore";

const createWorkspaceSchema = z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(50, "Workspace name must be less than 50 characters"),
    slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional().or(z.literal("")),
});

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

export default function CreateWorkspacePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { setWorkspaces, selectWorkspace } = useWorkspaceStore();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateWorkspaceValues>({
        resolver: zodResolver(createWorkspaceSchema),
        defaultValues: {
            name: "",
            slug: "",
        },
    });

    async function onSubmit(data: CreateWorkspaceValues) {
        setIsLoading(true);
        try {
            const response = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create workspace");
            }

            const { data: result } = await response.json();

            // Refresh workspaces list
            const workspacesRes = await fetch("/api/workspaces");
            if (workspacesRes.ok) {
                const { data: workspacesData } = await workspacesRes.json();
                setWorkspaces(workspacesData.workspaces);
                selectWorkspace(result.workspace.id);
            }

            toast.success("Workspace created successfully");
            router.push("/c"); // Redirect to creator dashboard
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="container max-w-2xl py-20">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create a New Workspace</CardTitle>
                    <CardDescription>
                        Workspaces are shared environments where your team can collaborate on content.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Workspace Name</Label>
                            <Input
                                id="name"
                                placeholder="Acme Corp"
                                {...register("name")}
                            />
                            <p className="text-sm text-muted-foreground">
                                This is the name of your company, team or organization.
                            </p>
                            {errors.name && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Workspace URL (Optional)</Label>
                            <Input
                                id="slug"
                                placeholder="acme-corp"
                                {...register("slug")}
                            />
                            <p className="text-sm text-muted-foreground">
                                Your workspace will be accessible at this URL slug.
                            </p>
                            {errors.slug && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {errors.slug.message}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Workspace
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
