/**
 * Enhanced Platform Preview Card Component
 * Based on Xocial SRS Section 3.3
 * Platform-specific preview with gradient header, character counter, and animations
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Calendar, RefreshCw, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPlatformGradient, getPlatformColor, getCharacterLimit, getCharacterCountColor, platformNames, Platform } from '@/lib/platform-colors';
import { fadeInUp, successCheck } from '@/lib/animations';
import { useState } from 'react';

interface PlatformPreviewCardProps {
    platform: Platform;
    content: string;
    isGenerating: boolean;
    hashtags?: string[];
    onCopy: () => void;
    onSchedule: () => void;
    onRefreshHashtags?: () => void;
    isHashtagLoading?: boolean;
}

export function PlatformPreviewCard({
    platform,
    content,
    isGenerating,
    hashtags = [],
    onCopy,
    onSchedule,
    onRefreshHashtags,
    isHashtagLoading,
}: PlatformPreviewCardProps) {
    const [copied, setCopied] = useState(false);

    const characterLimit = getCharacterLimit(platform);
    const characterCount = content.length;
    const characterColor = getCharacterCountColor(characterCount, characterLimit);

    const handleCopy = () => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="rounded-xl border border-gray-200 overflow-hidden shadow-soft"
        >
            {/* Platform Header with Gradient */}
            <div className={cn("h-16 bg-gradient-to-r flex items-center px-4", getPlatformGradient(platform))}>
                <h3 className="text-white font-semibold text-lg">
                    {platformNames[platform]}
                </h3>
            </div>

            {/* Content Area */}
            <div className="p-5 bg-white">
                <div className="min-h-[120px] rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4">
                    <AnimatePresence mode="wait">
                        {content ? (
                            <motion.p
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-pre-wrap text-sm text-gray-900"
                            >
                                {content}
                            </motion.p>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-8 text-gray-500"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="mb-3 h-6 w-6 animate-spin" />
                                        <span className="text-sm">Generating {platformNames[platform]} caption...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mb-3 h-6 w-6" />
                                        <span className="text-sm">AI copy will appear here</span>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Character Counter & Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium", characterColor)}>
                            {characterCount} / {characterLimit}
                        </span>
                        {characterCount > characterLimit && (
                            <Badge variant="warning" className="text-xs">
                                Over limit
                            </Badge>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopy}
                            disabled={!content}
                            className="relative"
                        >
                            <AnimatePresence mode="wait">
                                {copied ? (
                                    <motion.div
                                        key="check"
                                        variants={successCheck}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="flex items-center"
                                    >
                                        <Check className="mr-1 h-3 w-3" />
                                        Copied
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="copy"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center"
                                    >
                                        <Copy className="mr-1 h-3 w-3" />
                                        Copy
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Button>
                        <Button
                            size="sm"
                            onClick={onSchedule}
                            disabled={!content || characterCount > characterLimit}
                        >
                            <Calendar className="mr-1 h-3 w-3" />
                            Schedule
                        </Button>
                    </div>
                </div>

                {/* Hashtags */}
                {content && hashtags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap items-center gap-2">
                            {hashtags.slice(0, 10).map((tag) => (
                                <Badge
                                    key={`${platform}-${tag}`}
                                    variant="secondary"
                                    className="text-xs"
                                    style={{ backgroundColor: `${getPlatformColor(platform)}20` }}
                                >
                                    #{tag}
                                </Badge>
                            ))}
                            {onRefreshHashtags && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="px-2 py-1 text-xs h-auto"
                                    onClick={onRefreshHashtags}
                                    disabled={isHashtagLoading}
                                >
                                    {isHashtagLoading ? (
                                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                        <Sparkles className="mr-1 h-3 w-3" />
                                    )}
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
