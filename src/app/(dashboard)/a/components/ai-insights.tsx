'use client';

import { Sparkles, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AIInsights() {
    return (
        <Card className="relative overflow-hidden border-secondary-100 bg-white/50 p-1">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 blur-3xl opacity-50" />

            <div className="relative rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-secondary-900">
                                AI Performance Insights
                            </h3>
                            <p className="text-sm text-secondary-500 max-w-2xl">
                                Your engagement rate on Instagram has increased by <span className="font-semibold text-success-600">24%</span> this week.
                                Video content is performing <span className="font-semibold">2.5x better</span> than static images.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" className="gap-2 border-secondary-200 bg-white hover:bg-secondary-50 hover:border-secondary-300">
                            View Detailed Report
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 transition-all md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-100 text-success-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Best posting time</p>
                            <p className="text-xs text-secondary-500">Tuesday, 09:00 AM</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo-100 text-accent-indigo-600">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Top content format</p>
                            <p className="text-xs text-secondary-500">Reels & Shorts</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg bg-secondary-50/50 p-3 ring-1 ring-inset ring-secondary-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-secondary-900">Audience Growth</p>
                            <p className="text-xs text-secondary-500">+128 new followers</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
