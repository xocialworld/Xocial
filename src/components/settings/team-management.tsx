'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Crown, Shield, Edit3, Eye, MoreHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { useWorkspaceMembers, WorkspaceRole } from '@/hooks/use-workspace-members';

export function TeamManagement() {
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<WorkspaceRole>('creator');
    const [inviteMessage, setInviteMessage] = useState('');

    const selectedWorkspace = useSelectedWorkspace();
    const activeWorkspaceId = selectedWorkspace?.id;

    const {
        members,
        isLoading,
        inviteMember,
        isInviting,
        removeMember,
        isRemoving,
        updateRole,
    } = useWorkspaceMembers(activeWorkspaceId || '');

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inviteEmail) {
            toast.error('Please enter an email address');
            return;
        }

        if (!activeWorkspaceId) {
            toast.error('Select a workspace before inviting members');
            return;
        }

        inviteMember(
            {
                email: inviteEmail,
                role: inviteRole,
                message: inviteMessage,
            },
            {
                onSuccess: () => {
                    setInviteDialogOpen(false);
                    setInviteEmail('');
                    setInviteMessage('');
                }
            }
        );
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner':
                return <Crown className="h-4 w-4" />;
            case 'admin':
                return <Shield className="h-4 w-4" />;
            case 'manager':
                return <Shield className="h-4 w-4" />;
            case 'creator':
                return <Edit3 className="h-4 w-4" />;
            case 'analyst':
                return <Eye className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner':
                return 'bg-primary-500 text-white';
            case 'admin':
                return 'bg-purple-500 text-white';
            case 'manager':
                return 'bg-purple-500 text-white';
            case 'creator':
                return 'bg-success-500 text-white';
            case 'analyst':
                return 'bg-gray-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const handleRoleUpdate = (memberId: string, newRole: string) => {
        updateRole({ memberId, role: newRole as WorkspaceRole });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-secondary-900">Members</h3>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="member@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="role">Role</Label>
                                <select
                                    id="role"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    <option value="analyst">Analyst - View analytics only</option>
                                    <option value="creator">Creator - Create and edit content</option>
                                    <option value="manager">Manager - Manage content and members</option>
                                    <option value="admin">Admin - Full access except billing</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="message">Message (Optional)</Label>
                                <textarea
                                    id="message"
                                    placeholder="Add a personal message to the invitation"
                                    value={inviteMessage}
                                    onChange={(e) => setInviteMessage(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[80px]"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setInviteDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isInviting}>
                                    {isInviting ? 'Sending...' : 'Send Invitation'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : !members || members.length === 0 ? (
                <div className="text-center py-12 bg-secondary-50 rounded-lg">
                    <UserPlus className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                    <p className="text-secondary-600 mb-4">No team members yet</p>
                    <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                        Invite Your First Member
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-4 border border-secondary-100 rounded-lg hover:border-secondary-200 transition-colors"
                            data-testid={`member-row-${member.profile.email}`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <Avatar className="h-10 w-10">
                                    {member.profile.avatar_url ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={member.profile.avatar_url}
                                                alt={member.profile.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </>
                                    ) : (
                                        <div className="h-full w-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                                            {member.profile.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </Avatar>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-secondary-900">
                                            {member.profile.name}
                                        </h3>
                                        <Badge className={getRoleBadgeColor(member.role)}>
                                            <span className="flex items-center gap-1">
                                                {getRoleIcon(member.role)}
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </span>
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-secondary-600">{member.profile.email}</p>
                                    <p className="text-xs text-secondary-500 mt-1">
                                        Joined {formatDistanceToNow(new Date(member.joined_at))} ago
                                    </p>
                                </div>
                            </div>

                            {member.role !== 'owner' && (
                                <div className="flex gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {['admin', 'manager', 'creator', 'analyst'].map((roleOption) => (
                                                <DropdownMenuItem
                                                    key={roleOption}
                                                    onClick={() => handleRoleUpdate(member.id, roleOption)}
                                                    className="justify-between"
                                                >
                                                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                                                    {member.role === roleOption && <Check className="h-4 w-4 ml-2" />}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm(`Remove ${member.profile.name} from the team?`)) {
                                                removeMember(member.id);
                                            }
                                        }}
                                        disabled={isRemoving}
                                        className="text-error-600 hover:text-error-700 hover:bg-error-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
