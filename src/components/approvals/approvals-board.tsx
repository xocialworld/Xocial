"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Check,
    X,
    Clock,
    ClipboardCheck,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    User,
    Calendar,
    RefreshCw,
    Eye,
    MoreHorizontal,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PageHeader,
    PageContainer,
} from "@/components/shared/page-components";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
type ApprovalStatus = "pending" | "approved" | "rejected";
type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "youtube" | "tiktok";

interface ApprovalItem {
    id: string;
    status: ApprovalStatus;
    created_at: string;
    post: {
        id: string;
        content: { text?: string; default?: { text?: string } } | null;
        platforms: Platform[];
    } | null;
    workflow: { name: string } | null;
    step: { id: string; step_order: number; required_role: string } | null;
    requested_by?: { name: string; avatar: string | null };
}

// Platform icons
const platformIcons: Record<Platform, typeof Instagram> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    tiktok: MessageSquare,
};

const platformColors: Record<Platform, string> = {
    instagram: "text-pink-600 bg-pink-50",
    facebook: "text-blue-600 bg-blue-50",
    twitter: "text-sky-600 bg-sky-50",
    linkedin: "text-indigo-600 bg-indigo-50",
    youtube: "text-red-600 bg-red-50",
    tiktok: "text-gray-600 bg-gray-50",
};

// Status config
const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: "Pending Review", color: "bg-amber-500", icon: Clock },
    approved: { label: "Approved", color: "bg-green-500", icon: Check },
    rejected: { label: "Rejected", color: "bg-red-500", icon: X },
};

// Fetch approvals
async function fetchApprovals() {
    const response = await fetch("/api/workflows/approvals");
    if (!response.ok) throw new Error("Failed to fetch approvals");
    return response.json();
}

// Perform approval action
async function performApprovalAction(data: {
    instance_id: string;
    step_id?: string;
    action: "approve" | "reject";
    comment?: string;
}) {
    const response = await fetch("/api/workflows/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to perform action");
    return response.json();
}

// Approval Card Component
function ApprovalCard({
    approval,
    onApprove,
    onReject,
    isLoading,
}: {
    approval: ApprovalItem;
    onApprove: (id: string, stepId?: string, comment?: string) => void;
    onReject: (id: string, stepId?: string, comment?: string) => void;
    isLoading: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [comment, setComment] = useState("");

    const contentText =
        approval.post?.content?.text ||
        approval.post?.content?.default?.text ||
        "No content preview";

    return (
        <Card className="bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            {approval.requested_by?.avatar ? (
                                <AvatarImage src={approval.requested_by.avatar} />
                            ) : (
                                <AvatarFallback className="bg-secondary-100 text-secondary-600 text-xs font-medium">
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium text-secondary-900">
                                {approval.requested_by?.name || "Team Member"}
                            </p>
                            <p className="text-xs text-secondary-500">
                                {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Post
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                View in Calendar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Workflow info */}
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                        {approval.workflow?.name || "Default Workflow"}
                    </Badge>
                    {approval.step?.step_order && (
                        <Badge variant="secondary" className="text-xs">
                            Step {approval.step.step_order}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4">
                {/* Content Preview */}
                <div className="text-sm text-secondary-700 line-clamp-3 mb-3">
                    {contentText}
                </div>

                {/* Platforms */}
                {approval.post?.platforms && approval.post.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {approval.post.platforms.map((platform) => {
                            const Icon = platformIcons[platform] || MessageSquare;
                            return (
                                <span
                                    key={platform}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize",
                                        platformColors[platform]
                                    )}
                                >
                                    <Icon className="h-3 w-3" />
                                    {platform}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Expandable comment section */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-xs text-secondary-500 hover:text-secondary-700 mb-3"
                >
                    <MessageSquare className="h-3 w-3" />
                    Add comment
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {expanded && (
                    <Textarea
                        placeholder="Add a comment (optional)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mb-3 min-h-[60px] text-sm"
                    />
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => onReject(approval.id, approval.step?.id, comment)}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => onApprove(approval.id, approval.step?.id, comment)}
                        disabled={isLoading}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Main Component
export function ApprovalsBoard() {
    const queryClient = useQueryClient();
    const [activeFilter, setActiveFilter] = useState<ApprovalStatus | "all">("all");

    // Fetch approvals
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["approvals"],
        queryFn: fetchApprovals,
    });

    // Approve/Reject mutations
    const actionMutation = useMutation({
        mutationFn: performApprovalAction,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["approvals"] });
            toast.success(
                variables.action === "approve"
                    ? "Content approved successfully!"
                    : "Content rejected"
            );
        },
        onError: () => {
            toast.error("Failed to perform action");
        },
    });

    const handleApprove = (id: string, stepId?: string, comment?: string) => {
        actionMutation.mutate({
            instance_id: id,
            step_id: stepId,
            action: "approve",
            comment: comment || "Approved via dashboard",
        });
    };

    const handleReject = (id: string, stepId?: string, comment?: string) => {
        actionMutation.mutate({
            instance_id: id,
            step_id: stepId,
            action: "reject",
            comment: comment || "Rejected via dashboard",
        });
    };

    const approvals: ApprovalItem[] = data?.data || [];

    // Group by status for Kanban
    const pendingApprovals = approvals.filter((a) => a.status === "pending");
    const approvedApprovals = approvals.filter((a) => a.status === "approved");
    const rejectedApprovals = approvals.filter((a) => a.status === "rejected");

    // Filter for list view
    const filteredApprovals = activeFilter === "all"
        ? approvals
        : approvals.filter((a) => a.status === activeFilter);

    return (
        <PageContainer>
            <PageHeader
                shortCode="W"
                title="Approvals"
                description={
                    pendingApprovals.length > 0
                        ? `${pendingApprovals.length} pending approval${pendingApprovals.length === 1 ? "" : "s"} awaiting review`
                        : "Review and approve content before publishing"
                }
                icon={ClipboardCheck}
                iconColor="text-amber-500"
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                        Refresh
                    </Button>
                }
            />

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => {
                    const count = status === "all"
                        ? approvals.length
                        : approvals.filter((a) => a.status === status).length;
                    return (
                        <Button
                            key={status}
                            variant={activeFilter === status ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setActiveFilter(status)}
                            className="gap-2"
                        >
                            {status === "all" ? "All" : statusConfig[status].label}
                            {count > 0 && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs",
                                        activeFilter === status && "bg-white/20 text-white"
                                    )}
                                >
                                    {count}
                                </Badge>
                            )}
                        </Button>
                    );
                })}
            </div>

            {/* Kanban Board */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((col) => (
                        <div key={col} className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            {[1, 2].map((i) => (
                                <Skeleton key={i} className="h-48 w-full" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : activeFilter === "all" ? (
                // Kanban View
                <div className="grid gap-6 md:grid-cols-3 min-h-[400px]">
                    {/* Pending Column */}
                    <div className="bg-amber-50/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-3 w-3 rounded-full bg-amber-500" />
                            <h3 className="font-semibold text-secondary-900">Pending Review</h3>
                            <Badge variant="secondary" className="text-xs">{pendingApprovals.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {pendingApprovals.length === 0 ? (
                                <p className="text-sm text-secondary-500 text-center py-8">
                                    No pending approvals
                                </p>
                            ) : (
                                pendingApprovals.map((approval) => (
                                    <ApprovalCard
                                        key={approval.id}
                                        approval={approval}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        isLoading={actionMutation.isPending}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Approved Column */}
                    <div className="bg-green-50/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <h3 className="font-semibold text-secondary-900">Approved</h3>
                            <Badge variant="secondary" className="text-xs">{approvedApprovals.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {approvedApprovals.length === 0 ? (
                                <p className="text-sm text-secondary-500 text-center py-8">
                                    No approved items
                                </p>
                            ) : (
                                approvedApprovals.slice(0, 5).map((approval) => (
                                    <Card key={approval.id} className="bg-white p-3">
                                        <p className="text-sm text-secondary-700 line-clamp-2 mb-2">
                                            {approval.post?.content?.text || approval.post?.content?.default?.text || "No content"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-green-600">
                                            <Check className="h-3 w-3" />
                                            Approved {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Rejected Column */}
                    <div className="bg-red-50/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <h3 className="font-semibold text-secondary-900">Rejected</h3>
                            <Badge variant="secondary" className="text-xs">{rejectedApprovals.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {rejectedApprovals.length === 0 ? (
                                <p className="text-sm text-secondary-500 text-center py-8">
                                    No rejected items
                                </p>
                            ) : (
                                rejectedApprovals.slice(0, 5).map((approval) => (
                                    <Card key={approval.id} className="bg-white p-3">
                                        <p className="text-sm text-secondary-700 line-clamp-2 mb-2">
                                            {approval.post?.content?.text || approval.post?.content?.default?.text || "No content"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-red-600">
                                            <X className="h-3 w-3" />
                                            Rejected {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Filtered List View
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredApprovals.length === 0 ? (
                        <Card className="col-span-full p-12 text-center">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary-100">
                                <ClipboardCheck className="h-10 w-10 text-secondary-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-secondary-900">No {activeFilter} Approvals</h2>
                            <p className="mt-2 text-secondary-600">
                                {activeFilter === "pending"
                                    ? "Great job! All caught up."
                                    : `No ${activeFilter} items to display.`}
                            </p>
                        </Card>
                    ) : (
                        filteredApprovals.map((approval) => (
                            <ApprovalCard
                                key={approval.id}
                                approval={approval}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                isLoading={actionMutation.isPending}
                            />
                        ))
                    )}
                </div>
            )}
        </PageContainer>
    );
}
