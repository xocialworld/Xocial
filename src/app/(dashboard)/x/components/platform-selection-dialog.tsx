"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Music } from 'lucide-react';
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
        connectLabel: 'Connect Instagram Professional Account via Meta Login',
        description: 'Use this for Instagram Business or Creator accounts linked to a Facebook Page.',
        requirements: [
            'Business or Creator Instagram account',
            'Linked Facebook Page with your Page access',
            'Meta permissions approved or your account added as a tester',
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
    const [connecting, setConnecting] = useState<Platform | null>(null);
    const { workspaceId, isReady, hasHydrated } = useWorkspaceContext();

    const handleConnect = async (platform: Platform) => {
        if (!isReady || !workspaceId) {
            toast.error(getWorkspaceNotReadyMessage(hasHydrated));
            return;
        }

        setConnecting(platform);

        const params = new URLSearchParams({
            platform,
            workspaceId,
            redirect: '/x',
        });

        window.location.href = `/api/auth/connect?${params.toString()}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Connect Social Account</DialogTitle>
                    <DialogDescription>
                        Choose a platform to connect. You&apos;ll be redirected to authenticate your account.
                    </DialogDescription>
                </DialogHeader>

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
                                    ${!isDisabled
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

                <div className="flex justify-end pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
