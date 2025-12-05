"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Activity, Users, Eye, MousePointerClick } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
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

export function OverviewCards({ metrics, loading }: OverviewCardsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-[100px]" />
                            </CardTitle>
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px] mb-2" />
                            <Skeleton className="h-4 w-[80px]" />
                            <div className="h-[40px] mt-4">
                                <Skeleton className="h-full w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {metric.label}
                        </CardTitle>
                        <metric.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline space-x-2">
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <div
                                className={`flex items-center text-xs ${metric.trend === "up"
                                        ? "text-green-500"
                                        : metric.trend === "down"
                                            ? "text-red-500"
                                            : "text-gray-500"
                                    }`}
                            >
                                {metric.trend === "up" ? (
                                    <ArrowUp className="h-3 w-3 mr-1" />
                                ) : metric.trend === "down" ? (
                                    <ArrowDown className="h-3 w-3 mr-1" />
                                ) : null}
                                {Math.abs(metric.change)}%
                            </div>
                        </div>
                        <div className="h-[40px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metric.data}>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                    Value
                                                                </span>
                                                                <span className="font-bold text-muted-foreground">
                                                                    {payload[0].value}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={
                                            metric.trend === "up"
                                                ? "#22c55e"
                                                : metric.trend === "down"
                                                    ? "#ef4444"
                                                    : "#888888"
                                        }
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
