'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Facebook } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectFacebookButtonProps {
    redirectPath?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ConnectFacebookButton({
    redirectPath = '/x',
    variant = 'primary',
    size = 'md',
    className,
}: ConnectFacebookButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = `/api/auth/connect?platform=facebook&redirect=${encodeURIComponent(redirectPath)}`;
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate Facebook connection');
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
            <Facebook className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : 'Connect Facebook'}
        </Button>
    );
}
