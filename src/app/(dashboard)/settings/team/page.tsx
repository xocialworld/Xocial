/**
 * Team Management Page
 * Manage workspace members, roles, and invitations
 */

'use client';
/* eslint-disable @next/next/no-img-element -- Team avatars may reference arbitrary remote URLs that require raw <img> usage */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Trash2, Crown, Shield, Edit3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  profile: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

/**
 * Fetch workspace members
 */
async function fetchMembers(workspaceId?: string) {
  const response = await fetch(
    `/api/team/members${workspaceId ? `?workspaceId=${workspaceId}` : ''}`
  );
  if (!response.ok) throw new Error('Failed to fetch members');
  return response.json();
}

/**
 * Invite member
 */
async function inviteMember(data: { email: string; role: string; message?: string; workspaceId?: string }) {
  const response = await fetch('/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to send invitation');
  return response.json();
}

/**
 * Remove member
 */
async function removeMember(memberId: string, workspaceId?: string) {
  const response = await fetch(
    `/api/team/members/${memberId}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`,
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) throw new Error('Failed to remove member');
  return response.json();
}

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const selectedWorkspace = useSelectedWorkspace();
  const activeWorkspaceId = selectedWorkspace?.id;

  // Fetch members
  const { data, isLoading } = useQuery({
    queryKey: ['team-members', activeWorkspaceId],
    queryFn: () => fetchMembers(activeWorkspaceId),
  });

  const members = data?.data?.members || [];

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (formData: { email: string; role: string; message?: string }) =>
      inviteMember({ ...formData, workspaceId: activeWorkspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Invitation sent successfully');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteMessage('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId, activeWorkspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Member removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    if (!activeWorkspaceId) {
      toast.error('Select a workspace before inviting members');
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
      message: inviteMessage,
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'editor':
        return <Edit3 className="h-4 w-4" />;
      case 'viewer':
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
      case 'editor':
        return 'bg-success-500 text-white';
      case 'viewer':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Team Management</h1>
            <p className="mt-2 text-secondary-600">
              Manage team members and their access permissions
            </p>
          </div>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-5 w-5" />
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
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="viewer">Viewer - View only access</option>
                    <option value="editor">Editor - Can create and edit content</option>
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
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Members List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-secondary-900 mb-6">Team Members</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-secondary-600 mb-4">No team members yet</p>
            <Button onClick={() => setInviteDialogOpen(true)}>
              Invite Your First Member
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member: Member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    {member.profile.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.name}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                        {member.profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Avatar>

                  {/* Info */}
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

                {/* Actions */}
                {member.role !== 'owner' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Change Role
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${member.profile.name} from the team?`)) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-error-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

