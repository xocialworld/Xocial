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
    MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

    const getPlatformColor = (platform: string) => {
        const colors: Record<string, string> = {
            facebook: "bg-blue-100 text-blue-800",
            instagram: "bg-pink-100 text-pink-800",
            twitter: "bg-sky-100 text-sky-800",
            linkedin: "bg-indigo-100 text-indigo-800",
            youtube: "bg-red-100 text-red-800",
            tiktok: "bg-gray-100 text-gray-800",
        };
        return colors[platform.toLowerCase()] || "bg-gray-100 text-gray-800";
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ChevronsUpDown className="ml-2 h-4 w-4" />;
        return sortDirection === "asc" ? (
            <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Advanced Analytics</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search content..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-[250px]"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-10">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Platform
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok"].map(
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
                                            className="capitalize"
                                        >
                                            {platform}
                                        </DropdownMenuCheckboxItem>
                                    )
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" className="h-10">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Content</TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => handleSort("platform")}>
                                        Platform <SortIcon column="platform" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => handleSort("publishedAt")}>
                                        Date <SortIcon column="publishedAt" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" onClick={() => handleSort("impressions")}>
                                        Impressions <SortIcon column="impressions" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" onClick={() => handleSort("engagement")}>
                                        Engagement <SortIcon column="engagement" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" onClick={() => handleSort("engagementRate")}>
                                        Eng. Rate <SortIcon column="engagementRate" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div className="truncate max-w-[300px]" title={item.content}>
                                                {item.content}
                                            </div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {item.type}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`capitalize ${getPlatformColor(item.platform)}`}
                                            >
                                                {item.platform}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(item.publishedAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.impressions.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.engagement.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {item.engagementRate.toFixed(2)}%
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {sortedData.length} results
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
