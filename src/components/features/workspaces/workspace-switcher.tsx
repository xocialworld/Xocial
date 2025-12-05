"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    ChevronsUpDown,
    Plus,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Workspace = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
};

export function WorkspaceSwitcher() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        const fetchWorkspaces = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch workspaces where user is owner or member
                const { data: memberWorkspaces, error: memberError } = await supabase
                    .from("workspace_members")
                    .select("workspace_id")
                    .eq("user_id", user.id);

                if (memberError) throw memberError;

                const workspaceIds = memberWorkspaces?.map(w => w.workspace_id) || [];

                const { data: ownedWorkspaces, error: ownedError } = await supabase
                    .from("workspaces")
                    .select("id, name, slug, logo_url")
                    .eq("owner_id", user.id);

                if (ownedError) throw ownedError;

                // Combine and dedup
                const allWorkspaces = [...(ownedWorkspaces || [])];

                if (workspaceIds.length > 0) {
                    const { data: memberWorkspacesDetails, error: detailsError } = await supabase
                        .from("workspaces")
                        .select("id, name, slug, logo_url")
                        .in("id", workspaceIds);

                    if (detailsError) throw detailsError;

                    memberWorkspacesDetails?.forEach(w => {
                        if (!allWorkspaces.find(existing => existing.id === w.id)) {
                            allWorkspaces.push(w);
                        }
                    });
                }

                setWorkspaces(allWorkspaces);

                // Set initial selected workspace (could be from local storage or first available)
                // For now, just pick the first one
                if (allWorkspaces.length > 0) {
                    setSelectedWorkspace(allWorkspaces[0]);
                }
            } catch (error) {
                console.error("Error fetching workspaces:", error);
                toast.error("Failed to load workspaces");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspaces();
    }, []);

    const handleSelect = (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
        setOpen(false);
        // In a real app, you might redirect or update a global context/cookie here
        toast.success(`Switched to ${workspace.name}`);
        router.refresh();
    };

    if (loading) {
        return <div className="h-12 w-full animate-pulse rounded-md bg-secondary-800/50" />;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select a workspace"
                    className={cn(
                        "w-full justify-between hover:bg-secondary-800 hover:text-white",
                        open && "bg-secondary-800 text-white"
                    )}
                >
                    <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage
                            src={selectedWorkspace?.logo_url || ""}
                            alt={selectedWorkspace?.name}
                        />
                        <AvatarFallback className="text-xs bg-primary-600 text-white">
                            {selectedWorkspace?.name?.substring(0, 2).toUpperCase() || "WS"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                        {selectedWorkspace?.name || "Select Workspace"}
                    </span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandList>
                        <CommandInput placeholder="Search workspace..." />
                        <CommandEmpty>No workspace found.</CommandEmpty>
                        <CommandGroup heading="Workspaces">
                            {workspaces.map((workspace) => (
                                <CommandItem
                                    key={workspace.id}
                                    onSelect={() => handleSelect(workspace)}
                                    className="text-sm"
                                >
                                    <Avatar className="mr-2 h-5 w-5">
                                        <AvatarImage
                                            src={workspace.logo_url || ""}
                                            alt={workspace.name}
                                        />
                                        <AvatarFallback className="text-xs">
                                            {workspace.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {workspace.name}
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            selectedWorkspace?.id === workspace.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    <CommandSeparator />
                    <CommandList>
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setOpen(false);
                                    toast.info("Create Workspace feature coming soon");
                                }}
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Create Workspace
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
