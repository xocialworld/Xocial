"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Music } from 'lucide-react';
import { getPlatformGradient, platformNames, type Platform } from '@/lib/platform-colors';
import { LucideIcon } from 'lucide-react';

interface PlatformOption {
    id: Platform;
    name: string;
    icon: LucideIcon;
    available: boolean;
}

const platforms: PlatformOption[] = [
    { id: 'instagram', name: platformNames.instagram, icon: Instagram, available: true },
    { id: 'facebook', name: platformNames.facebook, icon: Facebook, available: true },
    { id: 'twitter', name: platformNames.twitter, icon: Twitter, available: true },
    { id: 'youtube', name: platformNames.youtube, icon: Youtube, available: true },
    { id: 'linkedin', name: platformNames.linkedin, icon: Linkedin, available: true },
    { id: 'tiktok', name: platformNames.tiktok, icon: Music, available: true },
];

interface PlatformSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

import { useSelectedWorkspace } from '@/store/workspaceStore';
import { toast } from 'sonner';

// ... imports

export function PlatformSelectionDialog({ open, onOpenChange }: PlatformSelectionDialogProps) {
    const [connecting, setConnecting] = useState<Platform | null>(null);
    const selectedWorkspace = useSelectedWorkspace();

    const handleConnect = async (platform: Platform) => {
        if (!selectedWorkspace) {
            toast.error('Please select a workspace first');
            return;
        }

        setConnecting(platform);
        // Redirect to OAuth flow
        window.location.href = `/api/auth/connect?platform=${platform}&workspaceId=${selectedWorkspace.id}`;
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

                <div className="grid grid-cols-2 gap-4 py-6 md:grid-cols-3">
                    {platforms.map((platform) => {
                        const Icon = platform.icon;
                        const gradient = getPlatformGradient(platform.id);
                        const isConnecting = connecting === platform.id;

                        return (
                            <button
                                key={platform.id}
                                onClick={() => handleConnect(platform.id)}
                                disabled={!platform.available || isConnecting}
                                className={`
                  group relative overflow-hidden rounded-xl p-6
                  transition-all duration-300
                  ${platform.available
                                        ? 'hover:scale-105 hover:shadow-xl cursor-pointer'
                                        : 'opacity-50 cursor-not-allowed'
                                    }
                  ${isConnecting ? 'animate-pulse' : ''}
                `}
                            >
                                {/* Gradient background */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`}
                                />

                                {/* Content */}
                                <div className="relative flex flex-col items-center gap-3 text-white">
                                    <Icon className="h-12 w-12" />
                                    <span className="font-semibold">{platform.name}</span>
                                    {!platform.available && (
                                        <span className="text-xs bg-white/20 px-2 py-1 rounded">
                                            Coming Soon
                                        </span>
                                    )}
                                    {isConnecting && (
                                        <span className="text-xs">Connecting...</span>
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
