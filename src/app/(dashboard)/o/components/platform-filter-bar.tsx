"use client";

import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useCalendarFiltersStore, platformOptions } from "@/store/calendarFiltersStore";
import { cn } from "@/lib/utils";

export function PlatformFilterBar() {
  const { platforms, togglePlatform } = useCalendarFiltersStore();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-secondary-500 text-sm font-medium mr-2 hidden md:inline-block">Platforms:</span>
      {platformOptions.map((platform) => {
        const isActive = platforms.includes(platform);
        return (
          <Button
            key={platform}
            variant="ghost"
            size="icon"
            onClick={() => togglePlatform(platform)}
            className={cn(
              "h-9 w-9 rounded-full transition-all border",
              isActive
                ? "bg-white border-primary-500 text-primary-600 shadow-sm"
                : "bg-transparent border-transparent text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100"
            )}
            title={`Toggle ${platform}`}
          >
            <PlatformIcon platform={platform} className="h-5 w-5" />
          </Button>
        );
      })}
    </div>
  );
}
