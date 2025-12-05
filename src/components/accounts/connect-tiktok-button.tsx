'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { toast } from 'sonner';

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

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = `/api/auth/connect?platform=tiktok&redirect=${encodeURIComponent(redirectPath)}`;
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate TikTok connection');
            setIsConnecting(false);
        }
    };

    return (
        <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant={variant}
            size={size}
            className={className}
        >
            <Music className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect TikTok'}
        </Button>
    );
}
