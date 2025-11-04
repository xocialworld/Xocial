'use client';

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialAccount } from "@/types";

interface AccountCardProps {
  account: SocialAccount;
  onDisconnect?: (id: string) => void;
  onSync?: (id: string) => void;
  className?: string;
}

const platformColors = {
  facebook: 'bg-[#1877F2]',
  instagram: 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
  twitter: 'bg-[#1DA1F2]',
  linkedin: 'bg-[#0A66C2]',
  tiktok: 'bg-black',
  youtube: 'bg-[#FF0000]',
};

const platformIcons = {
  facebook: '📘',
  instagram: '📷',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '📺',
};

export function AccountCard({ account, onDisconnect, onSync, className }: AccountCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

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

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", className)}>
      {/* Platform Header */}
      <div className={cn("h-20", platformColors[account.platform as keyof typeof platformColors])} />

      <div className="p-6">
        {/* Account Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative">
              {account.account_avatar ? (
                <img
                  src={account.account_avatar}
                  alt={account.account_name}
                  className="h-16 w-16 rounded-full border-4 border-white -mt-10 shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border-4 border-white -mt-10 shadow-md bg-secondary-200 flex items-center justify-center text-2xl">
                  {platformIcons[account.platform as keyof typeof platformIcons]}
                </div>
              )}
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white",
                  account.is_active ? "bg-success-500" : "bg-error-500"
                )}
              />
            </div>

            {/* Account Details */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-secondary-900">
                {account.account_name}
              </h3>
              {account.account_handle && (
                <p className="text-sm text-secondary-600">@{account.account_handle}</p>
              )}
              <Badge variant="secondary" className="mt-2 capitalize">
                {account.platform}
              </Badge>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 hover:bg-secondary-100 text-secondary-600"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-secondary-200 bg-white shadow-lg z-10">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                <a
                  href={`https://${account.platform}.com/${account.account_handle || account.account_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-secondary-700 hover:bg-secondary-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Profile
                </a>
                <hr className="my-1 border-secondary-200" />
                <button
                  onClick={handleDisconnect}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-secondary-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">
              {account.follower_count?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-secondary-600">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">-</p>
            <p className="text-xs text-secondary-600">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary-900">-</p>
            <p className="text-xs text-secondary-600">Engagement</p>
          </div>
        </div>

        {/* Last Synced */}
        {account.last_synced_at && (
          <p className="mt-4 text-xs text-center text-secondary-500">
            Last synced: {new Date(account.last_synced_at).toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
}

