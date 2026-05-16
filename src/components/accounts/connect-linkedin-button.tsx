'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceContext } from '@/hooks/use-workspace-fetch';
import { getWorkspaceNotReadyMessage } from '@/lib/fetch-with-workspace';

interface ConnectLinkedInButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ConnectLinkedInButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className,
}: ConnectLinkedInButtonProps) {
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
                platform: 'linkedin',
                redirect: redirectPath,
                workspaceId,
            });
            window.location.href = `/api/auth/connect?${params.toString()}`;
        } catch (error) {
            toast.error('Failed to initiate LinkedIn connection');
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
            <Linkedin className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect LinkedIn'}
        </Button>
    );
}
