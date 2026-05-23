'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Save, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Platform } from '@/types';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { platformNames } from '@/lib/platform-colors';

interface Account {
    id: string;
    platform: Platform;
    account_name: string;
    account_avatar?: string;
    is_active: boolean;
    token_expires_at?: string;
}

function isAccountOnline(account: Account): boolean {
    // Only consider account offline if explicitly deactivated.
    // Token expiration should be handled by the backend with refresh logic.
    return account.is_active;
}

function isAccountExpired(account: Account): boolean {
    // Only consider expired if token date is past AND account is inactive
    // (Active accounts may have auto-refreshed tokens)
    if (!account.token_expires_at) return false;
    if (account.is_active) return false; // Connected accounts are not expired
    const expiresAt = new Date(account.token_expires_at);
    // Buffer of 5 minutes to be safe
    return expiresAt.getTime() - 5 * 60 * 1000 < Date.now();
}

function getPlatformLabel(platform: Platform) {
    return platformNames[platform] || platform;
}

function formatPlatformList(platforms: Platform[]) {
    return platforms.map(getPlatformLabel).join(', ');
}

interface SchedulingControlsProps {
    selectedPlatforms: Platform[];
    hasContent: boolean;
    initialSchedule?: {
        date?: string;
        time?: string;
    };
    onSaveDraft: (accountSelections: Record<Platform, string>) => Promise<void>;
    onSchedule: (accountSelections: Record<Platform, string>, scheduledTime: Date) => Promise<void>;
    onPublish: (accountSelections: Record<Platform, string>) => Promise<void>;
    onRequestApproval?: (accountSelections: Record<Platform, string>) => Promise<void>;
    onMixedPublishSchedule?: (
        onlineAccounts: Record<Platform, string>,
        offlineAccounts: Record<Platform, string>,
        scheduledTime: Date
    ) => Promise<void>;
    isLoading?: boolean;
    accounts: Account[];
    accountSelections: Partial<Record<Platform, string>>;
    onAccountSelectionsChange: (selections: Partial<Record<Platform, string>>) => void;
    blockReason?: string;
}

export function SchedulingControls({
    selectedPlatforms,
    hasContent,
    initialSchedule,
    onSaveDraft,
    onSchedule,
    onPublish,
    onRequestApproval,
    onMixedPublishSchedule,
    isLoading = false,
    accounts,
    accountSelections,
    onAccountSelectionsChange,
    blockReason,
}: SchedulingControlsProps) {
    // Scheduling state
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isMixedScheduleOpen, setIsMixedScheduleOpen] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('10:00');

    // Initialize scheduled date from calendar deep links, falling back to tomorrow.
    useEffect(() => {
        if (initialSchedule?.date) {
            setScheduledDate(initialSchedule.date);
            setScheduledTime(initialSchedule.time || '10:00');
            return;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduledDate(tomorrow.toISOString().split('T')[0]);
        setScheduledTime('10:00');
    }, [initialSchedule?.date, initialSchedule?.time]);

    const allAccountsSelected = selectedPlatforms.every(platform => accountSelections[platform]);

    const canSchedule = hasContent && selectedPlatforms.length > 0 && allAccountsSelected && !blockReason;

    // Publish requires all selected accounts to be active
    const allActive = selectedPlatforms.every(platform => {
        const accountId = accountSelections[platform];
        const account = accounts.find(a => a.id === accountId);
        return account && isAccountOnline(account);
    });

    // Can publish if at least one account is active (for mixed mode)
    const anyActive = selectedPlatforms.some(platform => {
        const accountId = accountSelections[platform];
        const account = accounts.find(a => a.id === accountId);
        return account && isAccountOnline(account);
    });

    const canPublish = canSchedule && (allActive || (!!onMixedPublishSchedule && anyActive));

    const missingAccounts = selectedPlatforms.filter(
        platform => !accountSelections[platform]
    );

    // Find inactive accounts
    const inactiveAccounts = selectedPlatforms.filter(platform => {
        const accountId = accountSelections[platform];
        const account = accounts.find(a => a.id === accountId);
        return account && !isAccountOnline(account);
    });

    const handleConfirmSchedule = () => {
        if (!scheduledDate || !scheduledTime) return;

        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        onSchedule(accountSelections as Record<Platform, string>, dateTime);
        setIsScheduleOpen(false);
    };



    const handleConfirmMixedSchedule = () => {
        if (!scheduledDate || !scheduledTime || !onMixedPublishSchedule) return;

        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);

        const onlineAccounts: Record<Platform, string> = {} as Record<Platform, string>;
        const offlineAccounts: Record<Platform, string> = {} as Record<Platform, string>;

        selectedPlatforms.forEach(platform => {
            const accountId = accountSelections[platform];
            if (!accountId) return;

            const account = accounts.find(a => a.id === accountId);
            if (account && isAccountOnline(account)) {
                onlineAccounts[platform] = accountId;
            } else {
                offlineAccounts[platform] = accountId;
            }
        });

        onMixedPublishSchedule(onlineAccounts, offlineAccounts, dateTime);
        setIsMixedScheduleOpen(false);
    };

    return (
        <div className="sticky bottom-0 left-0 right-0 border-t border-secondary-200 bg-white/95 backdrop-blur-sm p-4 shadow-lg">
            <div className="mx-auto max-w-7xl">
                {/* Account Selection */}
                {selectedPlatforms.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <p className="text-sm font-medium text-secondary-700">
                            Select accounts for publishing:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {selectedPlatforms.map(platform => {
                                const platformAccounts = accounts.filter(
                                    acc => acc.platform?.toLowerCase() === platform.toLowerCase()
                                );
                                const selectedAccountId = accountSelections[platform];
                                const selectedAccount = accounts.find(a => a.id === selectedAccountId);
                                const isOnline = selectedAccount ? isAccountOnline(selectedAccount) : false;
                                const isExpired = selectedAccount ? isAccountExpired(selectedAccount) : false;

                                return (
                                    <div key={platform} className="flex items-center gap-2">
                                        <span className="text-sm font-medium capitalize text-secondary-600 min-w-[80px]">
                                            {getPlatformLabel(platform)}:
                                        </span>
                                        {platformAccounts.length > 0 ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <select
                                                    value={selectedAccountId || ''}
                                                    onChange={(e) => onAccountSelectionsChange({
                                                        ...accountSelections,
                                                        [platform]: e.target.value
                                                    })}
                                                    className={cn(
                                                        "flex-1 rounded-md border px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500",
                                                        selectedAccountId && !isOnline
                                                            ? "border-red-300 bg-red-50 text-red-900"
                                                            : selectedAccountId && isExpired
                                                                ? "border-amber-300 bg-amber-50 text-amber-900"
                                                                : "border-secondary-300"
                                                    )}
                                                >
                                                    {platformAccounts.map(acc => {
                                                        const isAccOnline = isAccountOnline(acc);
                                                        const isAccExpired = isAccountExpired(acc);
                                                        return (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.account_name} {!isAccOnline ? '(Offline)' : isAccExpired ? '(Token Expired)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                {selectedAccountId && !isOnline && (
                                                    <span
                                                        className="text-xs text-red-600 font-medium whitespace-nowrap"
                                                        title="Account is disconnected. Please reconnect."
                                                    >
                                                        Offline
                                                    </span>
                                                )}
                                                {selectedAccountId && isOnline && isExpired && (
                                                    <span
                                                        className="text-xs text-amber-600 font-medium whitespace-nowrap"
                                                        title={`Token expired: ${new Date(selectedAccount?.token_expires_at || '').toLocaleString()}. Will attempt refresh.`}
                                                    >
                                                        ⚠️ Expired
                                                    </span>
                                                )}
                                                {selectedAccountId && isOnline && !isExpired && (
                                                    <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                                                        Online
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-error-600">
                                                No account connected
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-secondary-600 w-full sm:w-auto text-center sm:text-left">
                        {selectedPlatforms.length === 0 ? (
                            'Select platforms to continue'
                        ) : !hasContent ? (
                            'Add content to continue'
                        ) : blockReason ? (
                            <span className="text-amber-600">{blockReason}</span>
                        ) : missingAccounts.length > 0 ? (
                            `Connect accounts: ${formatPlatformList(missingAccounts)}`
                        ) : inactiveAccounts.length > 0 ? (
                            <span className="text-amber-600">
                                {inactiveAccounts.length} offline
                                {anyActive ? ' - Will be scheduled' : ' - Schedule only'}
                            </span>
                        ) : (
                            `Ready to publish to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => onSaveDraft(accountSelections as Record<Platform, string>)}
                            disabled={!hasContent || isLoading}
                            className="gap-2 flex-1 sm:flex-none"
                            size="sm"
                        >
                            <Save className="h-4 w-4" />
                            <span className="hidden sm:inline">Save</span> Draft
                        </Button>

                        {onRequestApproval && (
                            <Button
                                variant="outline"
                                onClick={() => onRequestApproval(accountSelections as Record<Platform, string>)}
                                disabled={!canSchedule || isLoading}
                                className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 flex-1 sm:flex-none"
                                size="sm"
                            >
                                Request Approval
                            </Button>
                        )}

                        <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="secondary"
                                    disabled={!canSchedule || isLoading}
                                    className="gap-2 flex-1 sm:flex-none"
                                    size="sm"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Schedule
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end" sideOffset={5}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Schedule Post</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Choose when this post should go live.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="date">Date</Label>
                                            <input
                                                type="date"
                                                id="date"
                                                className="col-span-2 h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="time">Time</Label>
                                            <input
                                                type="time"
                                                id="time"
                                                className="col-span-2 h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleConfirmSchedule}
                                        className="w-full"
                                        disabled={!scheduledDate || !scheduledTime}
                                    >
                                        Schedule Post
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {inactiveAccounts.length > 0 && anyActive && onMixedPublishSchedule ? (
                            <Popover open={isMixedScheduleOpen} onOpenChange={setIsMixedScheduleOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        disabled={!canPublish || isLoading}
                                        className="gap-2 min-w-[100px] flex-1 sm:flex-none"
                                        size="sm"
                                    >
                                        <Send className="h-4 w-4" />
                                        Publish & Schedule
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="end" sideOffset={5}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Mixed Publishing</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Online accounts will be published <strong>immediately</strong>.
                                                <br />
                                                Offline accounts must be scheduled:
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <Label htmlFor="mixed-date">Date</Label>
                                                <input
                                                    type="date"
                                                    id="mixed-date"
                                                    className="col-span-2 h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                    value={scheduledDate}
                                                    onChange={(e) => setScheduledDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <Label htmlFor="mixed-time">Time</Label>
                                                <input
                                                    type="time"
                                                    id="mixed-time"
                                                    className="col-span-2 h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                    value={scheduledTime}
                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleConfirmMixedSchedule}
                                            className="w-full"
                                            disabled={!scheduledDate || !scheduledTime}
                                        >
                                            Confirm & Publish
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <Button
                                onClick={() => onPublish(accountSelections as Record<Platform, string>)}
                                disabled={!canPublish || isLoading}
                                className={cn(
                                    "gap-2 min-w-[100px] flex-1 sm:flex-none",
                                    !canPublish && canSchedule && "opacity-50 cursor-not-allowed bg-secondary-300 text-secondary-600 hover:bg-secondary-300"
                                )}
                                title={!canPublish && canSchedule ? "Some selected accounts are offline. You can only schedule posts." : "Publish immediately"}
                                size="sm"
                            >
                                <Send className="h-4 w-4" />
                                Publish
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
