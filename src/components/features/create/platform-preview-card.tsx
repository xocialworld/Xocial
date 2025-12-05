"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Edit3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Platform, MediaFile } from '@/types';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

type PlatformPreviewCardProps = {
    platform: Platform;
    content: string;
    media: MediaFile[];
    onChange: (content: string) => void;
    onAIRefine: (instruction: string) => void;
};

const PLATFORM_CONFIG: Record<Platform, {
    name: string;
    maxLength: number;
    color: string;
    bgGradient: string;
}> = {
    instagram: {
        name: 'Instagram',
        maxLength: 2200,
        color: 'text-pink-600',
        bgGradient: 'from-pink-500 to-purple-600',
    },
    facebook: {
        name: 'Facebook',
        maxLength: 63206,
        color: 'text-blue-600',
        bgGradient: 'from-blue-600 to-blue-700',
    },
    twitter: {
        name: 'Twitter',
        maxLength: 280,
        color: 'text-sky-500',
        bgGradient: 'from-sky-400 to-sky-600',
    },
    linkedin: {
        name: 'LinkedIn',
        maxLength: 3000,
        color: 'text-blue-700',
        bgGradient: 'from-blue-600 to-blue-800',
    },
    youtube: {
        name: 'YouTube',
        maxLength: 5000,
        color: 'text-red-600',
        bgGradient: 'from-red-600 to-red-700',
    },
    tiktok: {
        name: 'TikTok',
        maxLength: 2200,
        color: 'text-gray-900',
        bgGradient: 'from-gray-800 to-gray-900',
    },
};

const REFINE_OPTIONS = [
    { value: 'shorter', label: 'Make it shorter' },
    { value: 'longer', label: 'Make it longer' },
    { value: 'more_emojis', label: 'Add more emojis' },
    { value: 'more_professional', label: 'More professional' },
    { value: 'more_casual', label: 'More casual' },
    { value: 'add_urgency', label: 'Add call-to-action' },
    { value: 'hashtags', label: 'Add hashtags' },
];

export function PlatformPreviewCard({
    platform,
    content,
    media,
    onChange,
    onAIRefine,
}: PlatformPreviewCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(content);

    const config = PLATFORM_CONFIG[platform];
    const charCount = content.length;
    const isOverLimit = charCount > config.maxLength;
    const charPercentage = (charCount / config.maxLength) * 100;

    const handleSaveEdit = () => {
        onChange(editValue);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditValue(content);
        setIsEditing(false);
    };

    return (
        <div className="group rounded-xl border border-secondary-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-2.5 w-2.5 rounded-full bg-gradient-to-r",
                        config.bgGradient
                    )} />
                    <h4 className="text-sm font-semibold text-secondary-900">{config.name}</h4>
                </div>

                {/* Edit Button */}
                {!isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setEditValue(content);
                            setIsEditing(true);
                        }}
                        className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Content Preview/Edit */}
            <div className="mb-3">
                {isEditing ? (
                    <div className="space-y-2">
                        <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="min-h-[120px] text-sm"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="gap-1.5"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-[120px] whitespace-pre-wrap rounded-lg bg-secondary-50 p-3 text-sm text-secondary-900">
                        {content || (
                            <span className="text-secondary-400 italic">
                                Generate or write content to preview
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Media Preview */}
            {media.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                    {media.slice(0, 3).map((file) => (
                        <div
                            key={file.id}
                            className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-secondary-100"
                        >
                            {file.type === 'image' ? (
                                <Image
                                    src={file.url}
                                    alt={file.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs text-secondary-600">
                                    VIDEO
                                </div>
                            )}
                        </div>
                    ))}
                    {media.length > 3 && (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-xs font-medium text-secondary-600">
                            +{media.length - 3}
                        </div>
                    )}
                </div>
            )}

            {/* Character Count */}
            <div className="mb-3 flex items-center justify-between">
                <span className={cn(
                    "text-xs font-medium",
                    isOverLimit ? "text-red-600" :
                        charPercentage > 90 ? "text-amber-600" :
                            "text-secondary-600"
                )}>
                    {charCount}/{config.maxLength}
                </span>

                {isOverLimit && (
                    <Badge variant="error" className="text-xs">
                        Over limit by {charCount - config.maxLength}
                    </Badge>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary-200">
                <div
                    className={cn(
                        "h-full transition-all duration-300",
                        isOverLimit ? "bg-red-500" :
                            charPercentage > 90 ? "bg-amber-500" :
                                `bg-gradient-to-r ${config.bgGradient}`
                    )}
                    style={{ width: `${Math.min(charPercentage, 100)}%` }}
                />
            </div>

            {/* AI Refine Button */}
            {content && !isEditing && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Refine
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60" align="start">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Refine with AI</h4>
                            {REFINE_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => onAIRefine(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
