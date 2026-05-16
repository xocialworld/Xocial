'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceContext } from '@/hooks/use-workspace-fetch';
import { getWorkspaceNotReadyMessage } from '@/lib/fetch-with-workspace';

interface ConnectYouTubeButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    fullWidth?: boolean;
}

/**
 * ConnectYouTubeButton Component
 * 
 * Initiates YouTube OAuth flow when clicked.
 * Redirects user to Google OAuth consent screen, then back to callback handler.
 * 
 * @example
 * ```tsx
 * <ConnectYouTubeButton redirectPath="/x" />
 * ```
 */
export function ConnectYouTubeButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className = '',
    fullWidth = false,
}: ConnectYouTubeButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const { workspaceId, isReady, hasHydrated } = useWorkspaceContext();

    const handleConnect = async () => {
        if (!isReady || !workspaceId) {
            toast.error(getWorkspaceNotReadyMessage(hasHydrated));
            return;
        }

        setIsConnecting(true);

        try {
            // Build OAuth initiation URL
            const params = new URLSearchParams({
                platform: 'youtube',
                redirect: redirectPath,
                workspaceId,
            });

            const url = `/api/auth/connect?${params.toString()}`;

            // Redirect to OAuth flow
            window.location.href = url;
        } catch (error) {
            console.error('Failed to initiate YouTube connection:', error);
            toast.error('Failed to connect to YouTube. Please try again.');
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
            className={`${fullWidth ? 'w-full' : ''} ${className}`}
        >
            <Youtube className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect YouTube'}
        </Button>
    );
}
