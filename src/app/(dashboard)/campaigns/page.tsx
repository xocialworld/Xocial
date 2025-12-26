/**
 * Campaigns Management Page
 * View and manage marketing campaigns
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, BarChart3, Calendar, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader, PageContainer } from '@/components/shared/page-components';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  color: string;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  budget: number | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  posts_count?: { count: number }[];
  analytics?: {
    totalPosts: number;
    publishedPosts: number;
    totalEngagement: number;
  };
}

/**
 * Fetch campaigns
 */
async function fetchCampaigns() {
  const response = await fetch('/api/campaigns');
  if (!response.ok) throw new Error('Failed to fetch campaigns');
  return response.json();
}

/**
 * Delete campaign
 */
async function deleteCampaign(id: string) {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete campaign');
  return response.json();
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Fetch campaigns
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  const campaigns = data?.data?.campaigns || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete campaign');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-500';
      case 'paused':
        return 'bg-warning-500';
      case 'completed':
        return 'bg-info-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Campaigns"
        description="Organize and track your marketing campaigns"
        icon={Megaphone}
        iconColor="text-primary-500"
        actions={
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Create Campaign</span>
            <span className="inline sm:hidden">Create</span>
          </Button>
        }
      />

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-4">No campaigns yet</p>
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign: Campaign) => {
            const postsCount = campaign.posts_count?.[0]?.count || 0;

            return (
              <Card key={campaign.id} className="p-6 hover:shadow-md transition-shadow">
                {/* Color bar */}
                <div
                  className="h-1 w-full rounded-full mb-4"
                  style={{ backgroundColor: campaign.color }}
                />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-secondary-900 mb-1">
                      {campaign.name}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-secondary-600 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>

                {/* Goal */}
                {campaign.goal && (
                  <div className="mb-4">
                    <p className="text-sm text-secondary-600">
                      <span className="font-medium">Goal:</span> {campaign.goal}
                    </p>
                  </div>
                )}

                {/* Dates */}
                {(campaign.start_date || campaign.end_date) && (
                  <div className="mb-4 text-sm text-secondary-600">
                    {campaign.start_date && (
                      <div>
                        <span className="font-medium">Start:</span>{' '}
                        {new Date(campaign.start_date).toLocaleDateString()}
                      </div>
                    )}
                    {campaign.end_date && (
                      <div>
                        <span className="font-medium">End:</span>{' '}
                        {new Date(campaign.end_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-xs text-secondary-600">Posts</p>
                    <p className="text-lg font-semibold text-secondary-900">{postsCount}</p>
                  </div>
                  {campaign.budget && (
                    <div>
                      <p className="text-xs text-secondary-600">Budget</p>
                      <p className="text-lg font-semibold text-secondary-900">
                        ${campaign.budget.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Created date */}
                <p className="text-xs text-secondary-500 mb-4">
                  Created {formatDistanceToNow(new Date(campaign.created_at))} ago
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this campaign?')) {
                        deleteMutation.mutate(campaign.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-error-600" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

