"use client";

import { useState } from "react";
import {
    X,
    Sparkles,
    Calendar,
    BarChart3,
    Users,
    Rocket,
    ArrowRight,
    Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    onStartTour?: () => void;
    onSkip?: () => void;
    userName?: string;
}

const features = [
    {
        icon: Sparkles,
        title: "AI-Powered Content",
        description: "Generate engaging posts with our AI assistant",
        color: "bg-purple-100 text-purple-600",
        href: "/c",
    },
    {
        icon: Calendar,
        title: "Smart Scheduling",
        description: "Plan and schedule content across platforms",
        color: "bg-blue-100 text-blue-600",
        href: "/o",
    },
    {
        icon: BarChart3,
        title: "Analytics & Insights",
        description: "Track performance and get AI recommendations",
        color: "bg-orange-100 text-orange-600",
        href: "/a",
    },
    {
        icon: Users,
        title: "Team Collaboration",
        description: "Work together with approval workflows",
        color: "bg-green-100 text-green-600",
        href: "/approvals",
    },
];

export function WelcomeModal({
    open,
    onClose,
    onStartTour,
    onSkip,
    userName,
}: WelcomeModalProps) {
    const greeting = userName ? `Welcome, ${userName}!` : "Welcome to Xocial!";

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 px-6 py-8 text-white">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Rocket className="h-6 w-6" />
                            <span className="text-sm font-medium opacity-90">Getting Started</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{greeting}</h2>
                        <p className="text-white/80">
                            Let's explore what you can do with Xocial
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="p-6 space-y-3">
                    {features.map((feature) => (
                        <a
                            key={feature.title}
                            href={feature.href}
                            onClick={onClose}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary-50 transition-colors group"
                        >
                            <div className={cn("p-3 rounded-xl", feature.color)}>
                                <feature.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-secondary-900">{feature.title}</h3>
                                <p className="text-sm text-secondary-500">{feature.description}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-secondary-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                        </a>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    {onStartTour && (
                        <Button onClick={onStartTour} className="flex-1 gap-2">
                            <Play className="h-4 w-4" />
                            Take a Quick Tour
                        </Button>
                    )}
                    <Button
                        variant={onStartTour ? "outline" : "default"}
                        onClick={onSkip || onClose}
                        className="flex-1"
                    >
                        {onStartTour ? "Skip for now" : "Get Started"}
                    </Button>
                </div>

                {/* Footer hint */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-xs text-secondary-400">
                        Press <kbd className="px-1.5 py-0.5 bg-secondary-100 rounded text-secondary-600">?</kbd> anytime for help
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
