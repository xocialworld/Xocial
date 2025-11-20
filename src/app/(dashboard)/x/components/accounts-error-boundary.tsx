"use client";

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class AccountsErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('AccountsGrid error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="rounded-full bg-destructive/10 p-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Failed to load accounts</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-md">
                                {this.state.error?.message || 'An unexpected error occurred while loading your connected accounts.'}
                            </p>
                        </div>
                        <Button onClick={this.handleReset} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </div>
                </Card>
            );
        }

        return this.props.children;
    }
}
