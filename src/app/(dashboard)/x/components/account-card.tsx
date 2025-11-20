'use client';
/* eslint-disable @next/next/no-img-element -- Social account avatars are sourced directly from platform URLs and require <img> */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformGradient, getPlatformBadgeColor, platformNames, Platform } from "@/lib/platform-colors";
import { motion } from "framer-motion";
import { cardHover } from "@/lib/animations";
import type { SocialAccount } from "@/types";

const DEFAULT_METRICS = {
  postsPublished: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalEngagement: 0,
  avgEngagementRate: 0,
  lastPublishedAt: null,
  lastSyncedAt: null,
  totalVideoViews: 0,
};

interface AccountCardProps {
  account: SocialAccount;
  onDisconnect?: (id: string) => void;
  onSync?: (id: string) => void;
  className?: string;
}


export function AccountCard({ account, onDisconnect, onSync, className }: AccountCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const metrics = account.metrics ?? DEFAULT_METRICS;
  const youtubeStats =
    account.platform === "youtube"
      ? (account.metadata as any)?.statistics ?? null
      : null;

  const handleSync = async () => {
    setSyncing(true);
    await onSync?.(account.id);
    setSyncing(false);
  };

  const handleDisconnect = () => {
    if (confirm(`Are you sure you want to disconnect ${account.account_name}?`)) {
      onDisconnect?.(account.id);
    }
  };

  // Calculate 7-day growth (mock data - in production, fetch from analytics)
  const weeklyGrowth = {
    posts: Math.floor(Math.random() * 20) - 5,
    engagement: Math.floor(Math.random() * 30) - 10,
  };

  // Status color based on account state
  const getStatusColor = () => {
    if (!account.is_active) return 'text-red-600 bg-red-50';
    if (syncing) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusText = () => {
    if (!account.is_active) return 'Disconnected';
    if (syncing) return 'Syncing...';
    return 'Active';
  };

  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <Card className={cn("overflow-hidden", className)}>
        {/* Platform Header with Gradient */}
        <div className={cn("h-24 bg-gradient-to-r", getPlatformGradient(account.platform as Platform))} />

        <div className="p-6">
          {/* Account Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              {/* Avatar */}
              <div className="relative">
                {account.account_avatar ? (
                  <img
                    src={account.account_avatar}
                    alt={account.account_name}
                    className="h-16 w-16 rounded-full border-4 border-white -mt-12 shadow-medium"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full border-4 border-white -mt-12 shadow-medium bg-gray-200 flex items-center justify-center text-2xl">
                    {account.account_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Status Indicator */}
                <div
                  className={cn(
                    "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white",
                    account.is_active ? "bg-green-500" : "bg-red-500"
                  )}
                />
              </div>

              {/* Account Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {account.account_name}
                </h3>
                {account.account_handle && (
                  <p className="text-sm text-gray-600 truncate">@{account.account_handle}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize text-white",
                      getPlatformBadgeColor(account.platform as Platform)
                    )}
                  >
                    {platformNames[account.platform as Platform]}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor()}>
                    {getStatusText()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg p-2 hover:bg-gray-100 text-gray-600 transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-strong z-10">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                    {syncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <a
                    href={`https://${account.platform}.com/${account.account_handle || account.account_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Profile
                  </a>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={handleDisconnect}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <MetricBlock
              label="Followers"
              value={account.follower_count?.toLocaleString() ?? "0"}
            />
            <MetricBlock
              label="Posts (7d)"
              value={metrics.postsPublished.toLocaleString()}
              trend={weeklyGrowth.posts}
            />
            <MetricBlock
              label="Engagement"
              value={metrics.totalEngagement.toLocaleString()}
              helper={`${metrics.avgEngagementRate.toFixed(1)}% avg`}
              trend={weeklyGrowth.engagement}
            />
          </div>

          {/* Platform-specific insights */}
          <div className="mt-4 space-y-1 text-xs text-gray-600">
            <p className="flex items-center justify-between">
              <span>Last published:</span>
              <span className="font-medium">
                {metrics.lastPublishedAt ? new Date(metrics.lastPublishedAt).toLocaleDateString() : "—"}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span>Last synced:</span>
              <span className="font-medium">
                {metrics.lastSyncedAt
                  ? new Date(metrics.lastSyncedAt).toLocaleDateString()
                  : account.last_synced_at
                    ? new Date(account.last_synced_at).toLocaleDateString()
                    : "—"}
              </span>
            </p>
            {youtubeStats && (
              <p className="text-center pt-2 border-t border-gray-100">
                {youtubeStats.videoCount
                  ? `${Number(youtubeStats.videoCount).toLocaleString()} videos • `
                  : ""}
                {youtubeStats.viewCount
                  ? `${Number(youtubeStats.viewCount).toLocaleString()} lifetime views`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function MetricBlock({
  label,
  value,
  helper,
  trend,
}: {
  label: string;
  value: string;
  helper?: string;
  trend?: number;
}) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
      {helper && <p className="text-[10px] text-gray-500 mt-0.5">{helper}</p>}
      {trend !== undefined && trend !== 0 && (
        <div className={cn(
          "flex items-center justify-center gap-1 text-[10px] mt-1",
          trend > 0 ? "text-green-600" : "text-red-600"
        )}>
          {trend > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{Math.abs(trend)}</span>
        </div>
      )}
    </div>
  );
}


