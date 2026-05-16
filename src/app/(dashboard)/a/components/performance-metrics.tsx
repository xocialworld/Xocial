"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getNavigationTiming } from "@/lib/performance-monitoring";
import { Activity, Zap, Timer, Server, Globe } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";

export function PerformanceMetrics() {
    const [metrics, setMetrics] = useState<Record<string, number> | null>(null);

    useEffect(() => {
        // Small delay to ensure all timings are available
        const timer = setTimeout(() => {
            if (typeof window !== "undefined") {
                setMetrics(getNavigationTiming());
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    if (!metrics) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    const cards = [
        {
            key: "pageLoad",
            label: "Total Load Time",
            icon: Timer,
            color: "text-blue-500",
            bg: "bg-blue-100",
            description: "Duration from request to full page load"
        },
        {
            key: "serverResponse",
            label: "Server Latency",
            icon: Server,
            color: "text-purple-500",
            bg: "bg-purple-100",
            description: "Time waiting for initial server response"
        },
        {
            key: "domProcessing",
            label: "DOM Processing",
            icon: Activity,
            color: "text-green-500",
            bg: "bg-green-100",
            description: "Browser parsing and rendering time"
        },
        {
            key: "dnsLookup",
            label: "DNS Lookup",
            icon: Globe,
            color: "text-orange-500",
            bg: "bg-orange-100",
            description: "Time to resolve domain name"
        },
    ] as const;

    const chartData = [
        { name: "DNS", value: metrics.dnsLookup || 0, fill: "#f97316" },
        { name: "TCP", value: metrics.tcpConnection || 0, fill: "#eab308" },
        { name: "Server", value: metrics.serverResponse || 0, fill: "#a855f7" },
        { name: "DOM", value: metrics.domProcessing || 0, fill: "#22c55e" },
    ];

    const getStatusColor = (val: number, key: string) => {
        // Simple thresholds
        if (key === 'pageLoad') return val < 1000 ? 'text-green-600' : val < 2500 ? 'text-yellow-600' : 'text-red-600';
        if (key === 'serverResponse') return val < 200 ? 'text-green-600' : val < 500 ? 'text-yellow-600' : 'text-red-600';
        return 'text-secondary-900';
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((item) => {
                    const value = metrics[item.key] || 0;
                    return (
                        <Card key={item.key} className="border-secondary-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 rounded-lg ${item.bg}`}>
                                        <item.icon className={`h-5 w-5 ${item.color}`} />
                                    </div>
                                    <Zap className="h-4 w-4 text-secondary-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-secondary-500">{item.label}</p>
                                    <h3 className={`text-2xl font-bold mt-1 ${getStatusColor(value, item.key)}`}>
                                        {Math.round(value)} <span className="text-sm font-normal text-secondary-500">ms</span>
                                    </h3>
                                    <p className="text-xs text-secondary-400 mt-2 line-clamp-1">{item.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Card className="border-secondary-100 shadow-lg bg-white/90">
                <CardHeader>
                    <CardTitle>Navigation Timing Breakdown</CardTitle>
                    <CardDescription>Waterfall visualization of page load sequence</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={50} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
