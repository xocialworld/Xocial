"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

// Platform character limits
export const PLATFORM_LIMITS: Record<string, { caption: number; hashtags?: number; title?: number }> = {
    twitter: { caption: 280 },
    instagram: { caption: 2200, hashtags: 30 },
    facebook: { caption: 63206 },
    linkedin: { caption: 3000 },
    youtube: { caption: 5000, title: 100 },
    tiktok: { caption: 2200, hashtags: 100 },
    threads: { caption: 500 },
    pinterest: { caption: 500, title: 100 },
    bluesky: { caption: 300 },
};

interface CharacterCounterProps {
    platform: Platform;
    text: string;
    className?: string;
    showWarning?: boolean;
}

export function CharacterCounter({ platform, text, className, showWarning = true }: CharacterCounterProps) {
    const limit = PLATFORM_LIMITS[platform]?.caption || 2200;
    const count = text.length;
    const remaining = limit - count;
    const percentage = (count / limit) * 100;

    const status = useMemo(() => {
        if (percentage >= 100) return "over";
        if (percentage >= 90) return "warning";
        if (percentage >= 75) return "caution";
        return "safe";
    }, [percentage]);

    const statusColor = {
        safe: "text-secondary-500",
        caution: "text-amber-500",
        warning: "text-orange-500",
        over: "text-red-600 font-medium",
    };

    const progressColor = {
        safe: "bg-primary-500",
        caution: "bg-amber-500",
        warning: "bg-orange-500",
        over: "bg-red-600",
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Progress bar */}
            <div className="w-16 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-200", progressColor[status])}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Counter */}
            <span className={cn("text-xs tabular-nums", statusColor[status])}>
                {remaining >= 0 ? remaining : `+${Math.abs(remaining)}`}
            </span>

            {/* Warning message */}
            {showWarning && status === "over" && (
                <span className="text-xs text-red-600">
                    Over limit
                </span>
            )}
        </div>
    );
}

interface MultiPlatformCounterProps {
    platforms: Platform[];
    text: string;
    className?: string;
}

export function MultiPlatformCounter({ platforms, text, className }: MultiPlatformCounterProps) {
    if (platforms.length === 0) return null;

    // Find the most restrictive limit
    const mostRestrictive = useMemo(() => {
        let minLimit = Infinity;
        let platform: Platform | null = null;

        platforms.forEach((p) => {
            const limit = PLATFORM_LIMITS[p]?.caption || 2200;
            if (limit < minLimit) {
                minLimit = limit;
                platform = p;
            }
        });

        return { platform, limit: minLimit };
    }, [platforms]);

    const count = text.length;
    const remaining = mostRestrictive.limit - count;
    const isOver = remaining < 0;

    // Check which platforms are over limit
    const overLimitPlatforms = platforms.filter((p) => {
        const limit = PLATFORM_LIMITS[p]?.caption || 2200;
        return count > limit;
    });

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <span className="text-xs text-secondary-400">
                {count.toLocaleString()} characters
            </span>

            {mostRestrictive.platform && (
                <span className={cn(
                    "text-xs",
                    isOver ? "text-red-600" : "text-secondary-500"
                )}>
                    ({remaining >= 0 ? remaining : `+${Math.abs(remaining)}`} for {mostRestrictive.platform})
                </span>
            )}

            {overLimitPlatforms.length > 0 && (
                <span className="text-xs text-red-600 font-medium">
                    ⚠️ Over limit: {overLimitPlatforms.join(", ")}
                </span>
            )}
        </div>
    );
}

export function getPlatformLimit(platform: Platform): number {
    return PLATFORM_LIMITS[platform]?.caption || 2200;
}

export function isWithinLimit(platform: Platform, text: string): boolean {
    const limit = getPlatformLimit(platform);
    return text.length <= limit;
}

export function getOverLimitPlatforms(platforms: Platform[], text: string): Platform[] {
    return platforms.filter((p) => !isWithinLimit(p, text));
}
