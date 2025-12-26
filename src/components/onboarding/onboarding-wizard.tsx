"use client";

import { useState } from "react";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Link2,
    Users,
    Calendar,
    Rocket,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Youtube,
    ArrowRight,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingWizardProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const steps = [
    {
        id: "welcome",
        title: "Welcome to Xocial",
        description: "Let's get you set up in just a few minutes",
        icon: Sparkles,
    },
    {
        id: "workspace",
        title: "Create Your Workspace",
        description: "Organize your social media accounts",
        icon: Users,
    },
    {
        id: "connect",
        title: "Connect Accounts",
        description: "Link your social media profiles",
        icon: Link2,
    },
    {
        id: "first-post",
        title: "Create Your First Post",
        description: "Let AI help you get started",
        icon: Calendar,
    },
    {
        id: "complete",
        title: "You're All Set!",
        description: "Start managing your social presence",
        icon: Rocket,
    },
];

const socialPlatforms = [
    { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 to-pink-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "bg-black" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-[#0077B5]" },
    { id: "youtube", name: "YouTube", icon: Youtube, color: "bg-red-600" },
];

export function OnboardingWizard({ open, onClose, onComplete }: OnboardingWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [workspaceName, setWorkspaceName] = useState("");
    const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

    const goNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleAccount = (id: string) => {
        setConnectedAccounts((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        );
    };

    if (!open) return null;

    const renderStepContent = () => {
        switch (steps[currentStep].id) {
            case "welcome":
                return (
                    <div className="text-center max-w-md mx-auto">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 mx-auto mb-8 flex items-center justify-center">
                            <Sparkles className="h-12 w-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-secondary-900 mb-4">
                            Welcome to Xocial! 🎉
                        </h2>
                        <p className="text-secondary-600 text-lg mb-8">
                            The AI-powered platform that makes social media management effortless.
                            Let&apos;s set up your account in just 3 steps.
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {[
                                { icon: Users, label: "Create Workspace" },
                                { icon: Link2, label: "Connect Accounts" },
                                { icon: Calendar, label: "First Post" },
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-secondary-50">
                                    <item.icon className="h-6 w-6 mx-auto text-primary-500 mb-2" />
                                    <p className="text-sm text-secondary-600">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "workspace":
                return (
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 mx-auto mb-6 flex items-center justify-center">
                            <Users className="h-8 w-8 text-primary-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900 mb-2 text-center">
                            Create Your Workspace
                        </h2>
                        <p className="text-secondary-600 text-center mb-8">
                            A workspace helps you organize accounts and collaborate with your team.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                    Workspace Name
                                </label>
                                <Input
                                    placeholder="e.g., My Brand, Agency Name..."
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="h-12 text-lg"
                                />
                            </div>
                            <p className="text-xs text-secondary-500">
                                You can always change this later in Settings.
                            </p>
                        </div>
                    </div>
                );

            case "connect":
                return (
                    <div className="max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 mx-auto mb-6 flex items-center justify-center">
                            <Link2 className="h-8 w-8 text-primary-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900 mb-2 text-center">
                            Connect Your Accounts
                        </h2>
                        <p className="text-secondary-600 text-center mb-8">
                            Select the platforms you want to manage. You can add more later.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {socialPlatforms.map((platform) => (
                                <button
                                    key={platform.id}
                                    onClick={() => toggleAccount(platform.id)}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 transition-all text-left",
                                        connectedAccounts.includes(platform.id)
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-secondary-200 hover:border-primary-300 hover:bg-secondary-50"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", platform.color)}>
                                        <platform.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-secondary-900">{platform.name}</p>
                                    {connectedAccounts.includes(platform.id) && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-secondary-500 text-center mt-4">
                            Click to select. You&apos;ll authorize each account after this setup.
                        </p>
                    </div>
                );

            case "first-post":
                return (
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 mx-auto mb-6 flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-primary-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-secondary-900 mb-2 text-center">
                            Create Your First Post
                        </h2>
                        <p className="text-secondary-600 text-center mb-8">
                            Let our AI assistant help you create engaging content.
                        </p>
                        <div className="space-y-4">
                            <button className="w-full p-4 rounded-xl border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-secondary-900">Generate with AI</p>
                                        <p className="text-sm text-secondary-600">Let AI create content for you</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-primary-500 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                            <button className="w-full p-4 rounded-xl border-2 border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50 transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-secondary-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-secondary-900">Start from scratch</p>
                                        <p className="text-sm text-secondary-600">Write your own content</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-secondary-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>
                    </div>
                );

            case "complete":
                return (
                    <div className="text-center max-w-md mx-auto">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-500 mx-auto mb-8 flex items-center justify-center animate-bounce">
                            <Check className="h-12 w-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-secondary-900 mb-4">
                            You&apos;re All Set! 🚀
                        </h2>
                        <p className="text-secondary-600 text-lg mb-8">
                            Your workspace is ready. Start creating amazing content!
                        </p>
                        <div className="bg-secondary-50 rounded-xl p-6 text-left space-y-3">
                            <h3 className="font-semibold text-secondary-900">Quick tips:</h3>
                            <ul className="space-y-2 text-sm text-secondary-600">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Use ⌘K for quick search anywhere
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Press ? to see all keyboard shortcuts
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Click the AI button for content suggestions
                                </li>
                            </ul>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">X</span>
                    </div>
                    <span className="font-semibold text-secondary-900">Xocial</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4 mr-1" />
                    Skip setup
                </Button>
            </div>

            {/* Progress */}
            <div className="px-8 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-2">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                    i < currentStep
                                        ? "bg-primary-500 text-white"
                                        : i === currentStep
                                            ? "bg-primary-100 text-primary-600 ring-2 ring-primary-500"
                                            : "bg-secondary-100 text-secondary-400"
                                )}
                            >
                                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-1 mx-2 rounded-full transition-colors",
                                        i < currentStep ? "bg-primary-500" : "bg-secondary-200"
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-secondary-200">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={goBack}
                        disabled={currentStep === 0}
                        className="gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <p className="text-sm text-secondary-500">
                        Step {currentStep + 1} of {steps.length}
                    </p>
                    <Button onClick={goNext} className="gap-1">
                        {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
