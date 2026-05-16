'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Building2,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  Music,
} from 'lucide-react';
import { getPlatformGradient, platformNames, type Platform } from '@/lib/platform-colors';
import { LucideIcon } from 'lucide-react';
import { useWorkspaceContext } from '@/hooks/use-workspace-fetch';
import { getWorkspaceNotReadyMessage } from '@/lib/fetch-with-workspace';
import { toast } from 'sonner';

interface PlatformOption {
  id: Platform;
  name: string;
  icon: LucideIcon;
  available: boolean;
  connectLabel?: string;
  description?: string;
  requirements?: string[];
}

const platforms: PlatformOption[] = [
  {
    id: 'instagram',
    name: platformNames.instagram,
    icon: Instagram,
    available: true,
    connectLabel: 'Connect Instagram',
    description: 'Choose Instagram Professional login or a linked Facebook Page workflow.',
    requirements: [
      'Business or Creator Instagram account for publishing',
      'Use the Facebook Page path for agency or portfolio-managed accounts',
    ],
  },
  {
    id: 'facebook',
    name: platformNames.facebook,
    icon: Facebook,
    available: true,
    connectLabel: 'Connect Facebook Page',
    description: 'Use this for Facebook Page publishing, analytics, and comments.',
    requirements: [
      'Page access with create or manage permissions',
      'Meta permissions approved or your account added as a tester',
    ],
  },
  { id: 'twitter', name: platformNames.twitter, icon: Twitter, available: true },
  { id: 'youtube', name: platformNames.youtube, icon: Youtube, available: true },
  { id: 'linkedin', name: platformNames.linkedin, icon: Linkedin, available: true },
  { id: 'tiktok', name: platformNames.tiktok, icon: Music, available: true },
];

interface PlatformSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformSelectionDialog({ open, onOpenChange }: PlatformSelectionDialogProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showInstagramOptions, setShowInstagramOptions] = useState(false);
  const { workspaceId, isReady, hasHydrated } = useWorkspaceContext();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConnecting(null);
      setShowInstagramOptions(false);
    }
    onOpenChange(nextOpen);
  };

  const handleConnect = async (
    platform: Platform,
    connection?: 'instagram_login' | 'facebook_page'
  ) => {
    if (!isReady || !workspaceId) {
      toast.error(getWorkspaceNotReadyMessage(hasHydrated));
      return;
    }

    if (platform === 'instagram' && !connection) {
      setShowInstagramOptions(true);
      return;
    }

    const connectionKey = connection ? `${platform}:${connection}` : platform;
    setConnecting(connectionKey);

    const params = new URLSearchParams({
      platform,
      workspaceId,
      redirect: '/x',
    });

    if (connection) {
      params.set('connection', connection);
    }

    window.location.href = `/api/auth/connect?${params.toString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          {showInstagramOptions ? (
            <>
              <button
                type="button"
                onClick={() => setShowInstagramOptions(false)}
                className="mb-2 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to platforms
              </button>
              <DialogTitle className="text-2xl">Connect Instagram</DialogTitle>
              <DialogDescription>
                Choose how this Instagram account should authorize Xocial.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-2xl">Connect Social Account</DialogTitle>
              <DialogDescription>
                Choose a platform to connect. You&apos;ll be redirected to authenticate your
                account.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {showInstagramOptions ? (
          <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleConnect('instagram', 'instagram_login')}
              disabled={!isReady || connecting === 'instagram:instagram_login'}
              className={`
                                group relative min-h-[220px] overflow-hidden rounded-xl p-5 text-left
                                transition-all duration-300
                                ${
                                  isReady && connecting !== 'instagram:instagram_login'
                                    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl'
                                    : 'cursor-not-allowed opacity-50'
                                }
                                ${connecting === 'instagram:instagram_login' ? 'animate-pulse' : ''}
                            `}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 opacity-95 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-full flex-col gap-4 text-white">
                <div className="flex items-start gap-3">
                  <Instagram className="h-8 w-8 flex-shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold leading-5">
                      Instagram Professional Account
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/85">
                      Use this for Business or Creator accounts. Facebook Page not required.
                    </span>
                  </div>
                </div>
                <ul className="mt-auto space-y-1 text-xs leading-5 text-white/85">
                  <li className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>Opens Instagram Login.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>Supports publishing, comments, and insights after approval.</span>
                  </li>
                </ul>
                {connecting === 'instagram:instagram_login' && (
                  <span className="text-xs">Redirecting to Instagram...</span>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleConnect('instagram', 'facebook_page')}
              disabled={!isReady || connecting === 'instagram:facebook_page'}
              className={`
                                group relative min-h-[220px] overflow-hidden rounded-xl p-5 text-left
                                transition-all duration-300
                                ${
                                  isReady && connecting !== 'instagram:facebook_page'
                                    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl'
                                    : 'cursor-not-allowed opacity-50'
                                }
                                ${connecting === 'instagram:facebook_page' ? 'animate-pulse' : ''}
                            `}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 opacity-95 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-full flex-col gap-4 text-white">
                <div className="flex items-start gap-3">
                  <Building2 className="h-8 w-8 flex-shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold leading-5">
                      Instagram via Facebook Page
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/85">
                      Use this if the Instagram account is managed through a linked Facebook Page or
                      Business Portfolio.
                    </span>
                  </div>
                </div>
                <ul className="mt-auto space-y-1 text-xs leading-5 text-white/85">
                  <li className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>Opens Meta business asset selection.</span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>Requires Page access and a linked Instagram Professional account.</span>
                  </li>
                </ul>
                {connecting === 'instagram:facebook_page' && (
                  <span className="text-xs">Redirecting to Meta...</span>
                )}
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const gradient = getPlatformGradient(platform.id);
              const isConnecting = connecting === platform.id;
              const isDisabled = !isReady || !platform.available || isConnecting;

              return (
                <button
                  key={platform.id}
                  onClick={() => handleConnect(platform.id)}
                  disabled={isDisabled}
                  className={`
                                    group relative min-h-[172px] overflow-hidden rounded-xl p-5 text-left
                                    transition-all duration-300
                                    ${
                                      !isDisabled
                                        ? 'hover:-translate-y-0.5 hover:shadow-xl cursor-pointer'
                                        : 'opacity-50 cursor-not-allowed'
                                    }
                                    ${isConnecting ? 'animate-pulse' : ''}
                                `}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`}
                  />

                  <div className="relative flex h-full flex-col gap-3 text-white">
                    <div className="flex items-start gap-3">
                      <Icon className="h-8 w-8 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold leading-5">
                          {platform.connectLabel || platform.name}
                        </span>
                        {platform.description && (
                          <span className="mt-1 block text-xs leading-5 text-white/85">
                            {platform.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {platform.requirements && (
                      <ul className="mt-auto space-y-1 text-xs leading-5 text-white/85">
                        {platform.requirements.map((requirement) => (
                          <li key={requirement} className="flex gap-2">
                            <span aria-hidden="true">-</span>
                            <span>{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!platform.available && (
                      <span className="w-fit rounded bg-white/20 px-2 py-1 text-xs">
                        Coming Soon
                      </span>
                    )}
                    {isConnecting && (
                      <span className="text-xs">Redirecting to authorization...</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
