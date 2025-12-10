"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Search,
    Book,
    Keyboard,
    MessageCircle,
    Play,
    ChevronRight,
    ExternalLink,
    Calendar,
    Users,
    BarChart3,
    Sparkles,
    Image,
    Clock,
    HelpCircle,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HelpDrawerProps {
    open: boolean;
    onClose: () => void;
}

// Help articles data
const helpCategories = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: Play,
        color: "text-green-500",
        bgColor: "bg-green-50",
        articles: [
            { id: "gs-1", title: "Create your first post", duration: "2 min" },
            { id: "gs-2", title: "Connect social accounts", duration: "3 min" },
            { id: "gs-3", title: "Understanding your dashboard", duration: "4 min" },
            { id: "gs-4", title: "Invite team members", duration: "2 min" },
        ],
    },
    {
        id: "content",
        title: "Content Creation",
        icon: FileText,
        color: "text-purple-500",
        bgColor: "bg-purple-50",
        articles: [
            { id: "cc-1", title: "Using the AI assistant", duration: "3 min" },
            { id: "cc-2", title: "Multi-platform content variants", duration: "4 min" },
            { id: "cc-3", title: "Working with templates", duration: "3 min" },
            { id: "cc-4", title: "Media library basics", duration: "2 min" },
        ],
    },
    {
        id: "calendar",
        title: "Calendar & Scheduling",
        icon: Calendar,
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        articles: [
            { id: "cal-1", title: "Calendar view modes", duration: "2 min" },
            { id: "cal-2", title: "Drag and drop scheduling", duration: "2 min" },
            { id: "cal-3", title: "Bulk scheduling", duration: "3 min" },
            { id: "cal-4", title: "Best times to post", duration: "4 min" },
        ],
    },
    {
        id: "collaboration",
        title: "Team Collaboration",
        icon: Users,
        color: "text-orange-500",
        bgColor: "bg-orange-50",
        articles: [
            { id: "collab-1", title: "Approval workflows", duration: "4 min" },
            { id: "collab-2", title: "Content comments", duration: "2 min" },
            { id: "collab-3", title: "Roles & permissions", duration: "3 min" },
            { id: "collab-4", title: "Client collaboration", duration: "4 min" },
        ],
    },
    {
        id: "analytics",
        title: "Analytics & Reporting",
        icon: BarChart3,
        color: "text-pink-500",
        bgColor: "bg-pink-50",
        articles: [
            { id: "ana-1", title: "Understanding metrics", duration: "5 min" },
            { id: "ana-2", title: "Custom report builder", duration: "4 min" },
            { id: "ana-3", title: "Exporting data", duration: "2 min" },
            { id: "ana-4", title: "AI insights explained", duration: "3 min" },
        ],
    },
];

// Keyboard shortcuts data
const keyboardShortcuts = [
    {
        category: "Navigation",
        shortcuts: [
            { keys: ["⌘", "K"], description: "Quick search" },
            { keys: ["⌥", "C"], description: "Create new post" },
            { keys: ["⌥", "O"], description: "Open calendar" },
            { keys: ["⌥", "A"], description: "View analytics" },
            { keys: ["?"], description: "Show keyboard shortcuts" },
        ],
    },
    {
        category: "Composer",
        shortcuts: [
            { keys: ["⌘", "Enter"], description: "Save draft" },
            { keys: ["⌘", "⇧", "P"], description: "Preview post" },
            { keys: ["⌘", "I"], description: "AI assistant" },
            { keys: ["Esc"], description: "Close composer" },
        ],
    },
    {
        category: "Calendar",
        shortcuts: [
            { keys: ["←", "→"], description: "Navigate dates" },
            { keys: ["T"], description: "Go to today" },
            { keys: ["M"], description: "Month view" },
            { keys: ["W"], description: "Week view" },
        ],
    },
];

// Quick actions
const quickActions = [
    { icon: Sparkles, label: "Create post with AI", href: "/c", color: "text-purple-500" },
    { icon: Calendar, label: "View calendar", href: "/o", color: "text-blue-500" },
    { icon: Image, label: "Upload media", href: "/media", color: "text-green-500" },
    { icon: Users, label: "Invite team", href: "/settings?tab=team", color: "text-orange-500" },
];

export function HelpDrawer({ open, onClose }: HelpDrawerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"guides" | "shortcuts">("guides");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter articles based on search
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return helpCategories;

        const query = searchQuery.toLowerCase();
        return helpCategories
            .map((category) => ({
                ...category,
                articles: category.articles.filter(
                    (article) =>
                        article.title.toLowerCase().includes(query) ||
                        category.title.toLowerCase().includes(query)
                ),
            }))
            .filter((category) => category.articles.length > 0);
    }, [searchQuery]);

    if (!open || !mounted) return null;

    const drawerContent = (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-[9998]"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <HelpCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">Help Center</h2>
                            <p className="text-xs text-gray-500">Guides, tips & shortcuts</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search help articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setActiveTab("guides")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            activeTab === "guides"
                                ? "text-emerald-600"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Book className="h-4 w-4" />
                            Guides
                        </div>
                        {activeTab === "guides" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("shortcuts")}
                        className={cn(
                            "flex-1 py-3 text-sm font-medium transition-colors relative",
                            activeTab === "shortcuts"
                                ? "text-emerald-600"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Keyboard className="h-4 w-4" />
                            Shortcuts
                        </div>
                        {activeTab === "shortcuts" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                        )}
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {activeTab === "guides" ? (
                        <div className="p-5 space-y-6">
                            {/* Quick Actions */}
                            {!searchQuery && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Quick Actions
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {quickActions.map((action) => (
                                            <a
                                                key={action.label}
                                                href={action.href}
                                                onClick={onClose}
                                                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                                            >
                                                <action.icon className={cn("h-4 w-4", action.color)} />
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                                    {action.label}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories */}
                            {filteredCategories.map((category) => (
                                <div key={category.id}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={cn("p-1.5 rounded-lg", category.bgColor)}>
                                            <category.icon className={cn("h-4 w-4", category.color)} />
                                        </div>
                                        <h3 className="font-medium text-gray-900">{category.title}</h3>
                                    </div>
                                    <div className="space-y-1 bg-white rounded-lg border border-gray-200">
                                        {category.articles.map((article, idx) => (
                                            <button
                                                key={article.id}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group text-left",
                                                    idx !== category.articles.length - 1 && "border-b border-gray-100"
                                                )}
                                            >
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                                    {article.title}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {article.duration}
                                                    </Badge>
                                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {filteredCategories.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600">No articles found for "{searchQuery}"</p>
                                    <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-5 space-y-6">
                            {keyboardShortcuts.map((section) => (
                                <div key={section.category}>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        {section.category}
                                    </h3>
                                    <div className="bg-white rounded-lg border border-gray-200">
                                        {section.shortcuts.map((shortcut, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex items-center justify-between py-3 px-4",
                                                    i !== section.shortcuts.length - 1 && "border-b border-gray-100"
                                                )}
                                            >
                                                <span className="text-sm text-gray-700">{shortcut.description}</span>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, j) => (
                                                        <kbd
                                                            key={j}
                                                            className="min-w-[24px] px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded border border-gray-200 text-center"
                                                        >
                                                            {key}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                            <MessageCircle className="h-4 w-4" />
                            Contact Support
                        </button>
                        <button className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
                            <ExternalLink className="h-4 w-4" />
                            View all docs
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    // Use portal to render outside of header element
    return createPortal(drawerContent, document.body);
}
