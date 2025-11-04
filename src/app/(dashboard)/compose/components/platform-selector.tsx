'use client';

import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

interface PlatformSelectorProps {
  accounts: any[];
  selected: string[];
  onChange: (platforms: string[]) => void;
  loading?: boolean;
}

export function PlatformSelector({ accounts, selected, onChange, loading }: PlatformSelectorProps) {
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      facebook: Facebook,
      instagram: Instagram,
      twitter: Twitter,
      linkedin: Linkedin,
      youtube: Youtube,
    };
    return icons[platform.toLowerCase()] || Facebook;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      instagram: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
      twitter: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
      linkedin: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      youtube: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      tiktok: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    };
    return colors[platform.toLowerCase()] || colors.facebook;
  };

  const togglePlatform = (platform: string) => {
    if (selected.includes(platform)) {
      onChange(selected.filter(p => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

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

  // Group accounts by platform
  const platformGroups = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-3">
      {Object.entries(platformGroups).map(([platform, accountsList]) => {
        const platformAccounts = accountsList as any[];
        const Icon = getPlatformIcon(platform);
        const isSelected = selected.includes(platform);
        
        return (
          <button
            key={platform}
            onClick={() => togglePlatform(platform)}
            className={`
              w-full p-4 rounded-lg border-2 transition-all
              ${isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${getPlatformColor(platform)}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 capitalize">
                    {platform}
                  </div>
                  <div className="text-sm text-gray-500">
                    {platformAccounts.length} account{platformAccounts.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              {isSelected && (
                <Badge className="bg-blue-100 text-blue-700">
                  Selected
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

