"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AudienceActivity() {
    // Mock data generation for heatmap
    // Days of week x 24 hours
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Generate mock intensity (0-4) for each hour of each day
    // Heavier on weekdays 9-5 and evenings
    const getIntensity = (day: number, hour: number) => {
        // Random base
        let intensity = Math.floor(Math.random() * 2);

        // Work hours boost
        if (day > 0 && day < 6 && hour >= 9 && hour <= 17) {
            intensity += Math.floor(Math.random() * 3);
        }
        // Evening boost
        if (hour >= 19 && hour <= 22) {
            intensity += Math.floor(Math.random() * 3);
        }

        return Math.min(4, intensity);
    };

    const heatmapData = days.map((dayName, dayIndex) => ({
        day: dayName,
        hours: Array.from({ length: 24 }).map((_, hourIndex) => ({
            hour: hourIndex,
            value: getIntensity(dayIndex, hourIndex),
        })),
    }));

    const getColor = (value: number) => {
        switch (value) {
            case 0: return "bg-gray-100";
            case 1: return "bg-primary-100";
            case 2: return "bg-primary-300";
            case 3: return "bg-primary-500";
            case 4: return "bg-primary-700";
            default: return "bg-gray-100";
        }
    };

    return (
        <Card className="border-secondary-100 shadow-lg bg-white">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-accent-violet-100 rounded-lg">
                        <Clock className="h-5 w-5 text-accent-violet-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Active Times</CardTitle>
                        <CardDescription>When your followers are most active online</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex">
                        <div className="w-12"></div> {/* Y-axis label spacing */}
                        <div className="flex-1 flex justify-between px-1 text-xs text-secondary-400 font-mono uppercase">
                            <span>12am</span>
                            <span>6am</span>
                            <span>12pm</span>
                            <span>6pm</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {heatmapData.map((day, i) => (
                            <div key={day.day} className="flex items-center gap-2">
                                <span className="w-12 text-xs font-medium text-secondary-500">{day.day}</span>
                                <div className="flex-1 grid grid-cols-24 gap-1 h-8">
                                    {day.hours.map((hour) => (
                                        <TooltipProvider key={`${day.day}-${hour.hour}`}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`w-full h-full rounded-sm ${getColor(hour.value)} transition-colors hover:ring-2 ring-offset-1 ring-primary-400 cursor-help`}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-semibold">{day.day} {hour.hour > 12 ? hour.hour - 12 + 'pm' : hour.hour === 0 ? '12am' : hour.hour === 12 ? '12pm' : hour.hour + 'am'}</p>
                                                    <p className="text-xs text-muted-foreground">{['Very Low', 'Low', 'Moderate', 'High', 'Very High'][hour.value]} Activity</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 text-xs text-secondary-500">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary-100"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary-300"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary-500"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary-700"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
