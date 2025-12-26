"use client";

import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Filter,
    Search,
    Download,
    ExternalLink,
    Facebook,
    Instagram,
    Twitter,
    Linkedin,
    Youtube,
    Music2
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface AnalyticsPost {
    id: string;
    content: string;
    platform: "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok";
    publishedAt: string;
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    engagementRate: number;
    type: "image" | "video" | "carousel" | "text";
}

interface AdvancedAnalyticsTableProps {
    data: AnalyticsPost[];
    loading?: boolean;
}

type SortKey = keyof AnalyticsPost;
type SortDirection = "asc" | "desc";

// Platform visual mapping
const platformConfig: Record<string, { icon: any; color: string; bg: string }> = {
    facebook: { icon: Facebook, color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
    instagram: { icon: Instagram, color: "text-pink-600", bg: "bg-pink-50 hover:bg-pink-100" },
    twitter: { icon: Twitter, color: "text-sky-600", bg: "bg-sky-50 hover:bg-sky-100" },
    linkedin: { icon: Linkedin, color: "text-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100" },
    youtube: { icon: Youtube, color: "text-red-600", bg: "bg-red-50 hover:bg-red-100" },
    tiktok: { icon: Music2, color: "text-rose-600", bg: "bg-rose-50 hover:bg-rose-100" },
};

export function AdvancedAnalyticsTable({ data, loading }: AdvancedAnalyticsTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("desc");
        }
    };

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchesPlatform =
                filterPlatform.length === 0 || filterPlatform.includes(item.platform);
            const matchesSearch =
                item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.platform.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesPlatform && matchesSearch;
        });
    }, [data, filterPlatform, searchQuery]);

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortKey, sortDirection]);

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        return sortDirection === "asc" ? (
            <ChevronUp className="ml-2 h-4 w-4 text-primary" />
        ) : (
            <ChevronDown className="ml-2 h-4 w-4 text-primary" />
        );
    };

    const getPlatformBadge = (platform: string) => {
        const config = platformConfig[platform.toLowerCase()] || platformConfig.facebook;
        const Icon = config.icon;

        return (
            <Badge variant="outline" className={`gap-1.5 py-1 ${config.bg} ${config.color} border-current/20`}>
                <Icon className="h-3 w-3" />
                <span className="capitalize">{platform}</span>
            </Badge>
        );
    };

    return (
        <Card className="border-secondary-100 shadow-xl bg-white ring-1 ring-black/5">
            <CardHeader className="border-b border-secondary-100">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-xl">Content Performance</CardTitle>
                        <CardDescription>Deep dive into individual post analytics</CardDescription>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full sm:w-[250px] bg-background/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-10 bg-background/50">
                                        <Filter className="mr-2 h-4 w-4" />
                                        Platform
                                        {filterPlatform.length > 0 && (
                                            <Badge variant="secondary" className="ml-2 px-1 rounded-sm h-5 text-[10px]">
                                                {filterPlatform.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                    {Object.keys(platformConfig).map(
                                        (platform) => (
                                            <DropdownMenuCheckboxItem
                                                key={platform}
                                                checked={filterPlatform.includes(platform)}
                                                onCheckedChange={(checked) => {
                                                    setFilterPlatform((prev) =>
                                                        checked
                                                            ? [...prev, platform]
                                                            : prev.filter((p) => p !== platform)
                                                    );
                                                }}
                                                className="capitalize gap-2"
                                            >
                                                {platform}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" size="sm" className="h-10 bg-background/50">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[350px]">
                                    <Button variant="ghost" className="h-8 font-semibold w-full justify-start pl-2" onClick={() => handleSort("content")}>
                                        Content
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" className="h-8 font-semibold" onClick={() => handleSort("platform")}>
                                        Platform <SortIcon column="platform" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" className="h-8 font-semibold" onClick={() => handleSort("publishedAt")}>
                                        Date <SortIcon column="publishedAt" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" className="h-8 font-semibold" onClick={() => handleSort("impressions")}>
                                        Impressions <SortIcon column="impressions" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" className="h-8 font-semibold" onClick={() => handleSort("engagement")}>
                                        Engagement <SortIcon column="engagement" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" className="h-8 font-semibold" onClick={() => handleSort("engagementRate")}>
                                        Eng. Rate <SortIcon column="engagementRate" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7} className="h-16">
                                            <div className="flex items-center space-x-4">
                                                <div className="space-y-2 w-full">
                                                    <div className="h-4 w-[200px] bg-muted/20 rounded animate-pulse" />
                                                    <div className="h-3 w-[100px] bg-muted/20 rounded animate-pulse" />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No metrics found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col gap-1 max-w-[350px]">
                                                <div className="font-medium truncate" title={item.content}>
                                                    {item.content || "Untitled Post"}
                                                </div>
                                                <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                                    {item.type} • {item.id.slice(0, 8)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getPlatformBadge(item.platform)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(item.publishedAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {item.impressions.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {item.engagement.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.engagementRate > 5
                                                ? "bg-success-100 text-success-700"
                                                : item.engagementRate > 2
                                                    ? "bg-warning-100 text-warning-700"
                                                    : "bg-secondary-100 text-secondary-700"
                                                }`}>
                                                {item.engagementRate.toFixed(2)}%
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="px-4 py-3 border-t border-border/40 text-xs text-muted-foreground flex justify-between items-center bg-muted/10">
                    <span>Showing {sortedData.length} of {data.length} posts</span>
                    <span>Metrics updated in real-time</span>
                </div>
            </CardContent>
        </Card>
    );
}
