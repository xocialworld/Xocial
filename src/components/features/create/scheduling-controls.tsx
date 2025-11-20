"use client";

import { Button } from '@/components/ui/button';
import { Calendar, Send, Save } from 'lucide-react';
import type { CreateContent } from './unified-post-composer';

type SchedulingControlsProps = {
    content: CreateContent;
    onDraft: () => void;
    onSchedule: () => void;
    onPublish: () => void;
};

export function SchedulingControls({
    content,
    onDraft,
    onSchedule,
    onPublish,
}: SchedulingControlsProps) {
    const hasContent = content.text.trim().length > 0 || content.media.length > 0;
    const hasPlatforms = content.platforms.length > 0;
    const canPublish = hasContent && hasPlatforms;

    return (
        <div className="sticky bottom-0 z-10 rounded-xl border border-secondary-200 bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-secondary-900">Ready to publish?</h3>
                    <p className="mt-0.5 text-xs text-secondary-500">
                        {canPublish
                            ? `Publishing to ${content.platforms.length} platform${content.platforms.length > 1 ? 's' : ''}`
                            : 'Add content and select platforms to continue'
                        }
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Save Draft */}
                    <Button
                        variant="outline"
                        onClick={onDraft}
                        disabled={!hasContent}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Save Draft
                    </Button>

                    {/* Schedule */}
                    <Button
                        variant="outline"
                        onClick={onSchedule}
                        disabled={!canPublish}
                        className="gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        Schedule
                    </Button>

                    {/* Publish Now */}
                    <Button
                        onClick={onPublish}
                        disabled={!canPublish}
                        className="gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                    >
                        <Send className="h-4 w-4" />
                        Publish Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
