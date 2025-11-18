'use client';

import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { SocialAccount } from '@/types';
import type { ComponentType } from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  MonitorPlay,
} from 'lucide-react';

type PlatformAccountMap = Record<string, string | undefined>;

interface PlatformSelectorProps {
  accounts: SocialAccount[];
  selected: PlatformAccountMap;
  onChange: (platform: string, accountId?: string) => void;
  loading?: boolean;
}

const platformMeta: Record<
  string,
  { icon: ComponentType<any>; color: string; label: string }
> = {
  facebook: {
    icon: Facebook,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Facebook',
  },
  instagram: {
    icon: Instagram,
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    label: 'Instagram',
  },
  twitter: {
    icon: Twitter,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    label: 'Twitter / X',
  },
  linkedin: {
    icon: Linkedin,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    label: 'LinkedIn',
  },
  youtube: {
    icon: Youtube,
    color: 'bg-red-50 text-red-700 border-red-200',
    label: 'YouTube',
  },
  tiktok: {
    icon: MonitorPlay,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    label: 'TikTok',
  },
};

function sortAccounts(accs: SocialAccount[]) {
  return [...accs].sort((a, b) =>
    (a.account_name || '').localeCompare(b.account_name || '')
  );
}

export function PlatformSelector({
  accounts,
  selected,
  onChange,
  loading,
}: PlatformSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No connected accounts</p>
        <p className="text-sm text-gray-500 mt-1">
          Connect your social media accounts to start posting
        </p>
      </div>
    );
  }

  const grouped = accounts.reduce<Record<string, SocialAccount[]>>((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([platform, platformAccounts]) => {
        const meta = platformMeta[platform] ?? platformMeta.facebook;
        const Icon = meta.icon;
        const selectedAccountId = selected[platform];
        const sortedAccounts = sortAccounts(platformAccounts);

        return (
          <div
            key={platform}
            className={`w-full rounded-lg border-2 transition-all ${
              selectedAccountId ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${meta.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{meta.label}</div>
                  <div className="text-sm text-gray-500">
                    {platformAccounts.length} connected account
                    {platformAccounts.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {selectedAccountId && (
                <Badge className="bg-blue-100 text-blue-700">Selected</Badge>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white/70">
              {sortedAccounts.map((account) => {
                const isActive = selectedAccountId === account.id;
                return (
                  <button
                    type="button"
                    key={account.id}
                    onClick={() =>
                      onChange(platform, isActive ? undefined : account.id)
                    }
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-blue-100/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {account.account_name || account.account_handle || 'Untitled'}
                      </p>
                      {account.account_handle && (
                        <p className="text-xs text-gray-500">{account.account_handle}</p>
                      )}
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        isActive
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

