"use client";

import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MediaFile, Platform } from '@/types';
import { getCompatiblePlatforms, PLATFORM_CAPABILITIES } from '@/lib/platforms/capabilities';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { platformNames } from '@/lib/platform-colors';

type Account = {
    id: string;
    platform: Platform;
    account_name: string;
    is_active: boolean;
};

type InitialSchedule = {
    date?: string;
    time?: string;
};

type CreateReadinessPanelProps = {
    selectedPlatforms: Platform[];
    media: MediaFile[];
    hasText: boolean;
    accounts: Account[];
    accountSelections: Partial<Record<Platform, string>>;
    initialSchedule?: InitialSchedule;
};

type ReadinessIssue = {
    type: 'blocker' | 'warning';
    title: string;
    detail: string;
};

const PANEL_STEPS = [
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'schedule', label: 'Timing', icon: CalendarClock },
] as const;

function getPlatformLabel(platform: Platform) {
    return platformNames[platform] || platform;
}

export function CreateReadinessPanel({
    selectedPlatforms,
    media,
    hasText,
    accounts,
    accountSelections,
    initialSchedule,
}: CreateReadinessPanelProps) {
    const hasImages = media.some((item) => item.type === 'image');
    const hasVideos = media.some((item) => item.type === 'video');
    const imageCount = media.filter((item) => item.type === 'image').length;
    const videoCount = media.filter((item) => item.type === 'video').length;

    const { incompatible } = useMemo(
        () =>
            getCompatiblePlatforms(selectedPlatforms, {
                hasText,
                hasImages,
                hasVideos,
                imageCount,
                videoCount,
            }),
        [selectedPlatforms, hasText, hasImages, hasVideos, imageCount, videoCount]
    );

    const issues = useMemo<ReadinessIssue[]>(() => {
        const nextIssues: ReadinessIssue[] = [];

        if (selectedPlatforms.length === 0) {
            nextIssues.push({
                type: 'blocker',
                title: 'No target selected',
                detail: 'Select at least one workspace account or platform.',
            });
        }

        if (!hasText && media.length === 0) {
            nextIssues.push({
                type: 'blocker',
                title: 'No content yet',
                detail: 'Add a caption, brief, image, or video before scheduling.',
            });
        }

        selectedPlatforms.forEach((platform) => {
            const selectedAccountId = accountSelections[platform];
            const platformAccounts = accounts.filter(
                (account) => account.platform?.toLowerCase() === platform.toLowerCase()
            );

            if (platformAccounts.length === 0) {
                nextIssues.push({
                    type: 'warning',
                    title: `${getPlatformLabel(platform)} has no connected account`,
                    detail: 'You can save a draft, but publishing or scheduling requires a connected account.',
                });
                return;
            }

            if (!selectedAccountId) {
                nextIssues.push({
                    type: 'blocker',
                    title: `Choose a ${getPlatformLabel(platform)} account`,
                    detail: 'Scheduling and publishing need a specific account selection.',
                });
                return;
            }

            const selectedAccount = platformAccounts.find((account) => account.id === selectedAccountId);
            if (selectedAccount && !selectedAccount.is_active) {
                nextIssues.push({
                    type: 'warning',
                    title: `${selectedAccount.account_name} is offline`,
                    detail: 'Reconnect this account before publishing now.',
                });
            }
        });

        incompatible.forEach(({ platform, reason }) => {
            nextIssues.push({
                type: 'blocker',
                title: `${getPlatformLabel(platform)} content issue`,
                detail: reason,
            });
        });

        return nextIssues;
    }, [accountSelections, accounts, hasText, incompatible, media.length, selectedPlatforms]);

    const blockerCount = issues.filter((issue) => issue.type === 'blocker').length;
    const warningCount = issues.filter((issue) => issue.type === 'warning').length;
    const readyForSchedule = selectedPlatforms.length > 0 && hasTextOrMedia(hasText, media) && blockerCount === 0;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-secondary-900">Publish readiness</h3>
                        <p className="mt-1 text-xs text-secondary-500">
                            Checks are based on selected accounts, media, and platform API rules.
                        </p>
                    </div>
                    <Badge
                        variant={blockerCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
                        dot
                    >
                        {blockerCount > 0 ? `${blockerCount} blocker${blockerCount > 1 ? 's' : ''}` : warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : 'Ready'}
                    </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                    {PANEL_STEPS.map((step) => {
                        const Icon = step.icon;
                        const isDone = getStepState(step.id, {
                            selectedPlatforms,
                            hasText,
                            media,
                            blockerCount,
                            accountSelections,
                        });

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    "rounded-lg border px-3 py-2",
                                    isDone ? "border-emerald-200 bg-emerald-50" : "border-secondary-200 bg-secondary-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isDone ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <CircleDashed className="h-4 w-4 text-secondary-400" />
                                    )}
                                    <Icon className="h-3.5 w-3.5 text-secondary-500" />
                                    <span className="text-xs font-medium text-secondary-700">{step.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 space-y-3">
                    {issues.length === 0 ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            This post can be scheduled or published with the current selections.
                        </div>
                    ) : (
                        issues.slice(0, 5).map((issue) => (
                            <div
                                key={`${issue.type}-${issue.title}`}
                                className={cn(
                                    "rounded-lg border p-3",
                                    issue.type === 'blocker'
                                        ? "border-red-200 bg-red-50"
                                        : "border-amber-200 bg-amber-50"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <AlertTriangle
                                        className={cn(
                                            "mt-0.5 h-4 w-4 shrink-0",
                                            issue.type === 'blocker' ? "text-red-600" : "text-amber-600"
                                        )}
                                    />
                                    <div>
                                        <p className={cn(
                                            "text-sm font-medium",
                                            issue.type === 'blocker' ? "text-red-900" : "text-amber-900"
                                        )}>
                                            {issue.title}
                                        </p>
                                        <p className={cn(
                                            "mt-1 text-xs",
                                            issue.type === 'blocker' ? "text-red-700" : "text-amber-700"
                                        )}>
                                            {issue.detail}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-secondary-900">Selected destinations</h3>
                <div className="mt-4 space-y-3">
                    {selectedPlatforms.length === 0 ? (
                        <p className="text-sm text-secondary-500">No platforms selected yet.</p>
                    ) : (
                        selectedPlatforms.map((platform) => {
                            const account = accounts.find((item) => item.id === accountSelections[platform]);
                            const caps = PLATFORM_CAPABILITIES[platform];

                            return (
                                <div key={platform} className="rounded-lg border border-secondary-200 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <PlatformIcon platform={platform} className="h-4 w-4 text-secondary-700" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium capitalize text-secondary-900">
                                                    {account?.account_name || getPlatformLabel(platform)}
                                                </p>
                                                <p className="text-xs text-secondary-500">
                                                    {account ? 'Connected account' : 'Draft only until connected'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={account?.is_active ? 'success' : 'outline'} size="sm">
                                            {account?.is_active ? 'Online' : 'Draft'}
                                        </Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-secondary-500">
                                        {caps.requiresMedia ? 'Requires media' : 'Text-only allowed'} / {caps.maxTextLength.toLocaleString()} chars
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {initialSchedule?.date && (
                <div className={cn(
                    "rounded-xl border p-4",
                    readyForSchedule ? "border-blue-200 bg-blue-50" : "border-secondary-200 bg-white"
                )}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">Opened from Organize</p>
                    <p className="mt-1 text-sm font-medium text-secondary-900">
                        {initialSchedule.date} at {initialSchedule.time || '10:00'}
                    </p>
                    <p className="mt-1 text-xs text-secondary-500">
                        Scheduling will use this slot unless you change it in the action bar.
                    </p>
                </div>
            )}
        </div>
    );
}

function hasTextOrMedia(hasText: boolean, media: MediaFile[]) {
    return hasText || media.length > 0;
}

function getStepState(
    step: typeof PANEL_STEPS[number]['id'],
    state: {
        selectedPlatforms: Platform[];
        hasText: boolean;
        media: MediaFile[];
        blockerCount: number;
        accountSelections: Partial<Record<Platform, string>>;
    }
) {
    switch (step) {
        case 'accounts':
            return state.selectedPlatforms.length > 0 && state.selectedPlatforms.every((platform) => state.accountSelections[platform]);
        case 'content':
            return state.hasText;
        case 'media':
            return state.media.length > 0 || state.selectedPlatforms.every((platform) => !PLATFORM_CAPABILITIES[platform]?.requiresMedia);
        case 'schedule':
            return state.selectedPlatforms.length > 0 && hasTextOrMedia(state.hasText, state.media) && state.blockerCount === 0;
        default:
            return false;
    }
}
