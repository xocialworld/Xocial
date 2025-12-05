"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Mail, Trash2 } from "lucide-react";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";

interface TeamMembersProps {
    workspaceId: string;
}

export function TeamMembers({ workspaceId }: TeamMembersProps) {
    const [inviteEmail, setInviteEmail] = useState("");
    const { members, loading, inviteMember, removeMember } = useWorkspaceMembers(workspaceId);
    const [isInviting, setIsInviting] = useState(false);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setIsInviting(true);
        await inviteMember(inviteEmail);
        setInviteEmail("");
        setIsInviting(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            Manage who has access to this workspace
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Invite Form */}
                <div className="flex gap-4 p-4 bg-secondary-50 rounded-lg">
                    <Input
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-white"
                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    />
                    <Button
                        variant="secondary"
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                    >
                        {isInviting ? "Sending..." : "Send Invite"}
                    </Button>
                </div>

                {/* Members List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-4 text-secondary-500">Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-4 text-secondary-500">No members found</div>
                    ) : (
                        members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 border border-secondary-100 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                                        <AvatarFallback>{member.profile?.name?.charAt(0) || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-secondary-900">{member.profile?.name || "Unknown User"}</p>
                                        <div className="flex items-center gap-2 text-sm text-secondary-500">
                                            <Mail className="h-3 w-3" />
                                            {member.profile?.email}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                                        {member.role}
                                    </Badge>
                                    {member.role !== "owner" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeMember(member.user_id)}
                                            className="text-error-500 hover:text-error-600 hover:bg-error-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
