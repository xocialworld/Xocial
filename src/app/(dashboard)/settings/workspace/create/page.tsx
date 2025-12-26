"use client";

import { useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";

import { createWorkspaceSchema, type CreateWorkspaceInput } from "@/lib/validations";

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

function CreateWorkspaceForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get("next") || "/c";
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
            const workspacesRes = await fetch(`/api/workspaces?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (workspacesRes.ok) {
                const { data: workspacesData } = await workspacesRes.json();

                // Map API response to store format
                const formattedWorkspaces = workspacesData.workspaces.map((entry: any) => ({
                    id: entry.workspace.id,
                    name: entry.workspace.name,
                    slug: entry.workspace.slug,
                    role: entry.role,
                    logo_url: entry.workspace.logo_url,
                }));

                setWorkspaces(formattedWorkspaces);
                selectWorkspace(result.workspace.id);
            }

            toast.success("Workspace created successfully");
            router.push(nextUrl);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Create a New Workspace</CardTitle>
                <CardDescription>
                    Create a workspace to manage your social accounts and content.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Workspace Name</Label>
                        <Input
                            id="name"
                            placeholder="My Social Brand"
                            {...register("name")}
                        />
                        <p className="text-sm text-muted-foreground">
                            This is the name of your brand, project, or organization.
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
                            Your workspace will be accessible at this unique URL slug.
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
    );
}

export default function CreateWorkspacePage() {
    return (
        <div className="container max-w-2xl py-20">
            <Suspense fallback={
                <div className="flex justify-center py-20">
                    <Spinner />
                </div>
            }>
                <CreateWorkspaceForm />
            </Suspense>
        </div>
    );
}
