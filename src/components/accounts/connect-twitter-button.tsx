'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Twitter } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectTwitterButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ConnectTwitterButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className,
}: ConnectTwitterButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = `/api/auth/connect?platform=twitter&redirect=${encodeURIComponent(redirectPath)}`;
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate Twitter connection');
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
            <Twitter className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect Twitter'}
        </Button>
    );
}
