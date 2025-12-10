'use client';

import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    className?: string;
    iconClassName?: string;
}

/**
 * In-app help tooltip component
 * Shows a help icon that reveals helpful text on hover
 */
export function HelpTooltip({
    content,
    side = 'top',
    className,
    iconClassName,
}: HelpTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'inline-flex items-center justify-center rounded-full p-0.5',
                            'text-secondary-400 hover:text-secondary-600 transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                            className
                        )}
                        aria-label="Help"
                    >
                        <HelpCircle className={cn('h-4 w-4', iconClassName)} />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={side}
                    className="max-w-xs text-sm"
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Contextual help for common features
 */
export const HELP_TEXTS = {
    platformSelector: 'Select the platforms where you want to publish. Unconnected platforms will save as drafts only.',
    scheduledAt: 'Choose when to publish. Leave empty to save as draft or publish immediately.',
    aiGenerate: 'Use AI to generate content based on your brief. Press G for a shortcut.',
    calendarView: 'Click on any day to see scheduled posts. Drag posts to reschedule.',
    engagementInbox: 'Monitor comments and mentions from all your connected accounts in one place.',
    approvals: 'Review and approve content before publishing. Team members can submit posts for approval.',
    analytics: 'Track your social media performance with detailed metrics and insights.',
};
