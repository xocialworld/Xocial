'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';
import { toast } from 'sonner';

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

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = `/api/auth/connect?platform=linkedin&redirect=${encodeURIComponent(redirectPath)}`;
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate LinkedIn connection');
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
            <Linkedin className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect LinkedIn'}
        </Button>
    );
}
