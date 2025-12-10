"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Activity, Users, Eye, MousePointerClick, TrendingUp, BarChart3 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, Area, AreaChart, XAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export interface OverviewMetric {
    label: string;
    value: string | number;
    change: number;
    trend: "up" | "down" | "neutral";
    data: { value: number }[];
    icon: React.ElementType;
}

interface OverviewCardsProps {
    metrics: OverviewMetric[];
    loading?: boolean;
}

// Color themes for each metric type
const metricColors = [
    { gradient: "from-blue-500 to-indigo-600", light: "from-blue-50 to-indigo-50", text: "text-blue-600", chart: "#3b82f6" },
    { gradient: "from-emerald-500 to-teal-600", light: "from-emerald-50 to-teal-50", text: "text-emerald-600", chart: "#10b981" },
    { gradient: "from-purple-500 to-violet-600", light: "from-purple-50 to-violet-50", text: "text-purple-600", chart: "#8b5cf6" },
    { gradient: "from-orange-500 to-amber-600", light: "from-orange-50 to-amber-50", text: "text-orange-600", chart: "#f59e0b" },
];

export function OverviewCards({ metrics, loading }: OverviewCardsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-[100px]" />
                            </CardTitle>
                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[80px] mb-2" />
                            <Skeleton className="h-4 w-[60px]" />
                            <div className="h-[60px] mt-4">
                                <Skeleton className="h-full w-full rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => {
                const colors = metricColors[index % metricColors.length];
                return (
                    <Card
                        key={index}
                        className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                    >
                        {/* Gradient accent line */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />

                        {/* Subtle background pattern */}
                        <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.1] bg-gradient-to-br ${colors.light}`} />

                        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {metric.label}
                            </CardTitle>
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <metric.icon className="h-5 w-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="flex items-baseline gap-3">
                                <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{metric.value}</div>
                                <div
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${metric.trend === "up"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            : metric.trend === "down"
                                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {metric.trend === "up" ? (
                                        <ArrowUp className="h-3 w-3" />
                                    ) : metric.trend === "down" ? (
                                        <ArrowDown className="h-3 w-3" />
                                    ) : null}
                                    {metric.change > 0 ? "+" : ""}{Math.abs(metric.change).toFixed(1)}%
                                </div>
                            </div>
                            <div className="h-[60px] mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metric.data}>
                                        <defs>
                                            <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={colors.chart} stopOpacity={0.3} />
                                                <stop offset="100%" stopColor={colors.chart} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="rounded-lg border-0 bg-gray-900 px-3 py-2 shadow-xl">
                                                            <span className="text-sm font-semibold text-white">
                                                                {payload[0].value?.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={colors.chart}
                                            fill={`url(#gradient-${index})`}
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
