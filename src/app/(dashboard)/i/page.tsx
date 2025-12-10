"use client";

import { useState } from "react";
import {
    PageHeader,
    PageContainer,
    ContentCard,
    EmptyState,
    SectionTitle,
    StatCard,
    StatsGrid
} from "@/components/shared/page-components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    MessageCircle,
    Heart,
    TrendingUp,
    Bell,
    Filter,
    RefreshCw,
    UserPlus,
    Reply,
    ThumbsUp,
    Inbox,
    AtSign
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for engagement items
const mockEngagements = [
    {
        id: 1,
        type: 'comment',
        user: 'Sarah Johnson',
        handle: '@sarahj',
        avatar: null,
        content: 'This is such helpful content! Would love to see more like this.',
        platform: 'instagram',
        postTitle: 'How to grow your audience in 2024',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        responded: false
    },
    {
        id: 2,
        type: 'mention',
        user: 'Tech Daily',
        handle: '@techdaily',
        avatar: null,
        content: 'Great thread by @youraccount about social media strategies!',
        platform: 'twitter',
        postTitle: null,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        responded: true
    },
    {
        id: 3,
        type: 'like',
        user: 'Marketing Pro',
        handle: '@marketingpro',
        avatar: null,
        content: 'Liked your post',
        platform: 'linkedin',
        postTitle: '5 tips for better LinkedIn engagement',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        responded: false
    },
    {
        id: 4,
        type: 'follow',
        user: 'Growth Hacker',
        handle: '@growthhacker',
        avatar: null,
        content: 'Started following you',
        platform: 'instagram',
        postTitle: null,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        responded: false
    },
];

const filterOptions = [
    { id: 'all', label: 'All', icon: Inbox },
    { id: 'comments', label: 'Comments', icon: MessageCircle },
    { id: 'mentions', label: 'Mentions', icon: AtSign },
    { id: 'likes', label: 'Likes', icon: Heart },
    { id: 'follows', label: 'Follows', icon: UserPlus },
];

const platformColors: Record<string, string> = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    twitter: 'bg-black',
    linkedin: 'bg-blue-600',
    facebook: 'bg-blue-500',
    tiktok: 'bg-gradient-to-r from-pink-500 to-cyan-400',
    youtube: 'bg-red-600',
};

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export default function InfluencePage() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);

    const filteredEngagements = activeFilter === 'all'
        ? mockEngagements
        : mockEngagements.filter(e => e.type === activeFilter.slice(0, -1)); // Remove 's' from plural

    const handleRefresh = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
    };

    const stats = {
        totalEngagements: 1247,
        responseRate: 87,
        avgResponseTime: '2.5h',
        newFollowers: 156
    };

    return (
        <PageContainer>
            <PageHeader
                shortCode="I"
                title="Influence"
                description="Engage with your audience and build meaningful relationships"
                icon={Users}
                iconColor="text-pink-500"
                badge={{
                    label: `${mockEngagements.filter(e => !e.responded).length} unread`,
                    variant: 'warning'
                }}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                }
            />

            {/* Stats Row */}
            <StatsGrid columns={4} className="mb-5">
                <StatCard
                    label="Total Engagements"
                    value={stats.totalEngagements.toLocaleString()}
                    icon={MessageCircle}
                    iconColor="text-blue-500"
                    change={{ value: 12, isPositive: true }}
                />
                <StatCard
                    label="Response Rate"
                    value={`${stats.responseRate}%`}
                    icon={Reply}
                    iconColor="text-green-500"
                    change={{ value: 5, isPositive: true }}
                />
                <StatCard
                    label="Avg Response Time"
                    value={stats.avgResponseTime}
                    icon={TrendingUp}
                    iconColor="text-purple-500"
                    change={{ value: 15, isPositive: true }}
                />
                <StatCard
                    label="New Followers"
                    value={`+${stats.newFollowers}`}
                    icon={UserPlus}
                    iconColor="text-pink-500"
                    change={{ value: 23, isPositive: true }}
                />
            </StatsGrid>

            {/* Filter Tabs */}
            <ContentCard className="mb-6" padding="sm">
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
                    {filterOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setActiveFilter(option.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                activeFilter === option.id
                                    ? "bg-primary-100 text-primary-700 shadow-sm"
                                    : "text-secondary-600 hover:bg-secondary-100"
                            )}
                        >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                        </button>
                    ))}
                </div>
            </ContentCard>

            {/* Engagement Items */}
            <div className="space-y-4">
                <SectionTitle
                    title="Recent Activity"
                    description={`${filteredEngagements.length} engagements`}
                />

                {filteredEngagements.length === 0 ? (
                    <ContentCard>
                        <EmptyState
                            icon={Inbox}
                            title="No engagements found"
                            description="When people interact with your posts, you'll see them here."
                        />
                    </ContentCard>
                ) : (
                    <div className="space-y-3">
                        {filteredEngagements.map(engagement => (
                            <ContentCard
                                key={engagement.id}
                                padding="none"
                                hover
                                className={cn(
                                    "overflow-hidden",
                                    !engagement.responded && "border-l-4 border-l-primary-500"
                                )}
                            >
                                <div className="p-4 sm:p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary-200 to-secondary-300 flex items-center justify-center text-lg font-bold text-secondary-600">
                                                {engagement.user.charAt(0)}
                                            </div>
                                            <div className={cn(
                                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center",
                                                platformColors[engagement.platform] || "bg-secondary-500"
                                            )}>
                                                {engagement.type === 'comment' && <MessageCircle className="h-3 w-3 text-white" />}
                                                {engagement.type === 'mention' && <AtSign className="h-3 w-3 text-white" />}
                                                {engagement.type === 'like' && <Heart className="h-3 w-3 text-white" />}
                                                {engagement.type === 'follow' && <UserPlus className="h-3 w-3 text-white" />}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="font-semibold text-secondary-900">{engagement.user}</span>
                                                    <span className="text-secondary-500 text-sm ml-2">{engagement.handle}</span>
                                                </div>
                                                <span className="text-xs text-secondary-400 whitespace-nowrap">
                                                    {formatTimeAgo(engagement.timestamp)}
                                                </span>
                                            </div>

                                            <p className="text-secondary-700 mt-1 line-clamp-2">{engagement.content}</p>

                                            {engagement.postTitle && (
                                                <p className="text-sm text-secondary-500 mt-2">
                                                    On: <span className="font-medium text-secondary-600">{engagement.postTitle}</span>
                                                </p>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center gap-3 mt-3">
                                                {!engagement.responded && (
                                                    <Button size="sm" className="gap-2">
                                                        <Reply className="h-4 w-4" />
                                                        Reply
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="gap-2 text-secondary-500">
                                                    <ThumbsUp className="h-4 w-4" />
                                                    Like
                                                </Button>
                                                {engagement.responded && (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                        Responded
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContentCard>
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
