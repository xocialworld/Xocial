'use client';
/* eslint-disable @next/next/no-img-element -- Social account avatars are sourced directly from platform URLs and require <img> */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformGradient, getPlatformBadgeColor, platformNames, Platform } from "@/lib/platform-colors";
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
  onViewPosts?: (account: SocialAccount) => void;
  className?: string;
}

export function AccountCard({ account, onDisconnect, onSync, onViewPosts, className }: AccountCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const metrics = { ...DEFAULT_METRICS, ...(account.metrics || {}) };
  const youtubeStats =
    account.platform === "youtube"
      ? (account.metadata as any)?.statistics ?? null
      : null;

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await onSync?.(account.id);
    setSyncing(false);
    setShowMenu(false);
  };

  const handleDisconnect = () => {
    if (confirm(`Are you sure you want to disconnect ${account.account_name}?`)) {
      onDisconnect?.(account.id);
    }
    setShowMenu(false);
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
    <Card className={cn(
      "overflow-hidden h-full flex flex-col transition-shadow duration-200 hover:shadow-lg",
      className
    )}>
      {/* Platform Header with Gradient */}
      <div className={cn("h-20 bg-gradient-to-r flex-shrink-0", getPlatformGradient(account.platform as Platform))} />

      <div className="p-5 flex flex-col flex-1">
        {/* Account Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {account.account_avatar ? (
                <img
                  src={account.account_avatar}
                  alt={account.account_name}
                  className="h-14 w-14 rounded-full border-4 border-white -mt-10 shadow-lg object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border-4 border-white -mt-10 shadow-lg bg-secondary-100 flex items-center justify-center text-xl font-semibold text-secondary-600">
                  {account.account_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Status Indicator */}
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white",
                  account.is_active ? "bg-green-500" : "bg-red-500"
                )}
              />
            </div>

            {/* Account Details */}
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-base font-semibold text-secondary-900 truncate">
                {account.account_name}
              </h3>
              {account.account_handle && (
                <p className="text-sm text-secondary-500 truncate">@{account.account_handle}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize text-white text-xs",
                    getPlatformBadgeColor(account.platform as Platform)
                  )}
                >
                  {platformNames[account.platform as Platform]}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", getStatusColor())}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-1.5 hover:bg-secondary-100 text-secondary-500 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-secondary-200 bg-white shadow-xl z-20 overflow-hidden">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                <a
                  href={`https://${account.platform}.com/${account.account_handle || account.account_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Profile
                </a>
                <hr className="border-secondary-100" />
                <button
                  onClick={handleDisconnect}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Metrics */}
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-secondary-100 flex-shrink-0">
          <MetricBlock
            label="Followers"
            value={account.follower_count?.toLocaleString() ?? "0"}
          />
          <MetricBlock
            label="Posts (7d)"
            value={metrics.postsPublished.toLocaleString()}
          />
          <MetricBlock
            label="Engagement"
            value={metrics.totalEngagement.toLocaleString()}
            helper={`${metrics.avgEngagementRate.toFixed(1)}% avg`}
          />
        </div>

        {/* YouTube stats */}
        {youtubeStats && (
          <p className="text-center pt-1.5 text-secondary-500">
            {youtubeStats.videoCount
              ? `${Number(youtubeStats.videoCount).toLocaleString()} videos • `
              : ""}
            {youtubeStats.viewCount
              ? `${Number(youtubeStats.viewCount).toLocaleString()} lifetime views`
              : ""}
          </p>
        )}

        {/* Platform-specific insights - Fixed height section */}
        <div className="mt-auto pt-3 border-t border-secondary-100 space-y-1.5 text-xs text-secondary-600 min-h-[60px]">
          <p className="flex items-center justify-between">
            <span>Last published:</span>
            <span className="font-medium text-secondary-700">
              {metrics.lastPublishedAt ? new Date(metrics.lastPublishedAt).toLocaleDateString() : "—"}
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span>Last synced:</span>
            <span className="font-medium text-secondary-700">
              {metrics.lastSyncedAt
                ? new Date(metrics.lastSyncedAt).toLocaleDateString()
                : account.last_synced_at
                  ? new Date(account.last_synced_at).toLocaleDateString()
                  : "—"}
            </span>
          </p>
        </div>
      </div>

      {/* View Posts Button - Always at bottom */}
      <div className="px-5 pb-5 pt-0 flex-shrink-0">
        <button
          onClick={() => onViewPosts?.(account)}
          className="w-full py-2.5 text-sm font-medium text-secondary-700 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors"
        >
          View Posts
        </button>
      </div>
    </Card>
  );
}

function MetricBlock({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-secondary-900">{value}</p>
      <p className="text-xs text-secondary-500">{label}</p>
      {helper && <p className="text-[10px] text-secondary-400 mt-0.5">{helper}</p>}
    </div>
  );
}
