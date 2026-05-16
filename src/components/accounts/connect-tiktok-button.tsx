'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceContext } from '@/hooks/use-workspace-fetch';
import { getWorkspaceNotReadyMessage } from '@/lib/fetch-with-workspace';

interface ConnectTikTokButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ConnectTikTokButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className,
}: ConnectTikTokButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const { workspaceId, isReady, hasHydrated } = useWorkspaceContext();

    const handleConnect = async () => {
        if (!isReady || !workspaceId) {
            toast.error(getWorkspaceNotReadyMessage(hasHydrated));
            return;
        }

        setIsConnecting(true);
        try {
            const params = new URLSearchParams({
                platform: 'tiktok',
                redirect: redirectPath,
                workspaceId,
            });
            window.location.href = `/api/auth/connect?${params.toString()}`;
        } catch (error) {
            toast.error('Failed to initiate TikTok connection');
            setIsConnecting(false);
        }
    };

    return (
        <Button
            onClick={handleConnect}
            disabled={isConnecting || !isReady}
            title={!isReady ? getWorkspaceNotReadyMessage(hasHydrated) : undefined}
            variant={variant}
            size={size}
            className={className}
        >
            <Music className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect TikTok'}
        </Button>
    );
}
