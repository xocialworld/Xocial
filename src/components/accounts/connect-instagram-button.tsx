'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectInstagramButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ConnectInstagramButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className,
}: ConnectInstagramButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = `/api/auth/connect?platform=instagram&redirect=${encodeURIComponent(redirectPath)}`;
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate Instagram connection');
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
            <Instagram className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect Instagram'}
        </Button>
    );
}
