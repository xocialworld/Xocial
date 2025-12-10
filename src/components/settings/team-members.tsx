"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    UserPlus,
    Mail,
    Trash2,
    MoreHorizontal,
    Shield,
    Crown,
    Users,
    Loader2,
    Check
} from "lucide-react";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { cn } from "@/lib/utils";

interface TeamMembersProps {
    workspaceId: string;
}

const roleStyles = {
    owner: {
        icon: Crown,
        label: "Owner",
        colors: "bg-amber-100 text-amber-700 border-amber-200"
    },
    admin: {
        icon: Shield,
        label: "Admin",
        colors: "bg-purple-100 text-purple-700 border-purple-200"
    },
    member: {
        icon: Users,
        label: "Member",
        colors: "bg-secondary-100 text-secondary-700 border-secondary-200"
    },
};

export function TeamMembers({ workspaceId }: TeamMembersProps) {
    const [inviteEmail, setInviteEmail] = useState("");
    const { members, loading, inviteMember, removeMember } = useWorkspaceMembers(workspaceId);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteEmail)) {
            return;
        }

        setIsInviting(true);
        await inviteMember(inviteEmail);
        setInviteEmail("");
        setIsInviting(false);
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
                <h3 className="font-semibold text-secondary-900">Team Members</h3>
                <p className="text-sm text-secondary-500 mt-1">
                    Invite team members and manage their access to this workspace
                </p>
            </div>

            {/* Invite Form */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-4 w-4 text-primary-600" />
                    <span className="font-medium text-secondary-900">Invite a team member</span>
                </div>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                        <Input
                            type="email"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="h-10 pl-10 bg-white"
                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                        />
                    </div>
                    <Button
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                        className="h-10 min-w-[100px]"
                    >
                        {isInviting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : inviteSuccess ? (
                            <>
                                <Check className="h-4 w-4 mr-1" />
                                Sent!
                            </>
                        ) : (
                            "Invite"
                        )}
                    </Button>
                </div>
                <p className="text-xs text-secondary-500 mt-2">
                    They'll receive an email invitation to join your workspace
                </p>
            </div>

            {/* Members List */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-secondary-700">
                        Team ({members.length} {members.length === 1 ? 'member' : 'members'})
                    </h4>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-secondary-400" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-8 bg-secondary-50 rounded-xl">
                        <Users className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
                        <p className="text-secondary-600 font-medium">No team members yet</p>
                        <p className="text-sm text-secondary-500 mt-1">
                            Invite colleagues to collaborate on this workspace
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {members.map((member) => {
                            const roleStyle = roleStyles[member.role as keyof typeof roleStyles] || roleStyles.member;
                            const RoleIcon = roleStyle.icon;

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-white border border-secondary-100 rounded-xl hover:border-secondary-200 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-medium">
                                                {member.profile?.name?.charAt(0)?.toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-secondary-900 truncate">
                                                    {member.profile?.name || "Unknown User"}
                                                </p>
                                                {member.role === 'owner' && (
                                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", roleStyle.colors)}>
                                                        <RoleIcon className="h-3 w-3 mr-1" />
                                                        {roleStyle.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-secondary-500 truncate">
                                                {member.profile?.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {member.role !== 'owner' && (
                                            <>
                                                <Badge variant="outline" className={cn("text-xs", roleStyle.colors)}>
                                                    {roleStyle.label}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeMember(member.user_id)}
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pending Invites Section (placeholder) */}
            <div className="pt-4 border-t border-secondary-100">
                <h4 className="text-sm font-medium text-secondary-700 mb-3">Pending Invitations</h4>
                <div className="text-center py-6 bg-secondary-50 rounded-xl">
                    <p className="text-sm text-secondary-500">No pending invitations</p>
                </div>
            </div>
        </div>
    );
}
