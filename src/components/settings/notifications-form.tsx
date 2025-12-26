"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Mail,
    Bell,
    MessageSquare,
    CheckCircle2,
    Send,
    Megaphone,
    Loader2,
    Check,
    Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationPreferences, NotificationChannelPreferences } from "@/types";

interface NotificationCategoryConfig {
    id: keyof Omit<NotificationPreferences, "digest_frequency">;
    label: string;
    description: string;
    icon: any;
    hasPush: boolean;
    hasEmail: boolean;
}

const categoryConfigs: NotificationCategoryConfig[] = [
    {
        id: "approvals",
        label: "Approval Requests",
        description: "When content needs your review and approval",
        icon: CheckCircle2,
        hasEmail: true,
        hasPush: true,
    },
    {
        id: "comments",
        label: "Comments & Mentions",
        description: "When someone comments on or mentions your content",
        icon: MessageSquare,
        hasEmail: true,
        hasPush: true,
    },
    {
        id: "publishing",
        label: "Publishing Status",
        description: "When posts are published successfully or fail",
        icon: Send,
        hasEmail: true,
        hasPush: false,
    },
    {
        id: "analytics",
        label: "Weekly Analytics",
        description: "Weekly summary of your social media performance",
        icon: Bell,
        hasEmail: true,
        hasPush: false,
    },
    {
        id: "marketing",
        label: "Product Updates",
        description: "News about Xocial features and improvements",
        icon: Megaphone,
        hasEmail: false,
        hasPush: false,
    },
];

const defaultPreferences: NotificationPreferences = {
    approvals: { email: true, push: true, in_app: true },
    comments: { email: true, push: true, in_app: true },
    publishing: { email: true, push: false, in_app: true },
    analytics: { email: true, push: false, in_app: false },
    marketing: { email: true, push: false, in_app: false },
    digest_frequency: 'weekly'
};

function NotificationRow({
    config,
    preferences,
    onEmailChange,
    onPushChange
}: {
    config: NotificationCategoryConfig;
    preferences: NotificationPreferences;
    onEmailChange: (checked: boolean) => void;
    onPushChange: (checked: boolean) => void;
}) {
    const Icon = config.icon;
    // Safe access in case preferences structure doesn't match config yet
    const categoryPrefs = preferences[config.id];

    if (!categoryPrefs) return null;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-secondary-100 last:border-0">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-secondary-600" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-secondary-900">{config.label}</p>
                    <p className="text-sm text-secondary-500 line-clamp-1">{config.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 pl-12 sm:pl-0">
                <label className={cn("flex items-center gap-2", !config.hasEmail && "opacity-50 cursor-not-allowed")}>
                    <Switch
                        checked={categoryPrefs.email}
                        onCheckedChange={onEmailChange}
                        disabled={!config.hasEmail}
                    />
                    <span className="text-xs font-medium text-secondary-600 hidden sm:inline">Email</span>
                </label>
                <label className={cn("flex items-center gap-2", !config.hasPush && "opacity-50 cursor-not-allowed")}>
                    <Switch
                        checked={categoryPrefs.push}
                        onCheckedChange={onPushChange}
                        disabled={!config.hasPush}
                    />
                    <span className="text-xs font-medium text-secondary-600 hidden sm:inline">Push</span>
                </label>
            </div>
        </div>
    );
}

export function NotificationsForm() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function loadPreferences() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("notification_preferences")
                    .eq("id", user.id)
                    .single();

                if (profile?.notification_preferences) {
                    // Merge with defaults to ensure all keys exist
                    const loadedPrefs = profile.notification_preferences as unknown as NotificationPreferences;
                    setPreferences({
                        ...defaultPreferences,
                        ...loadedPrefs
                    });
                }
            } catch (error) {
                console.error("Error loading notification preferences:", error);
                toast.error("Failed to load preferences");
            } finally {
                setLoading(false);
            }
        }

        loadPreferences();
    }, [supabase]);

    const updatePreference = (categoryId: keyof Omit<NotificationPreferences, 'digest_frequency'>, channel: 'email' | 'push', value: boolean) => {
        setPreferences(prev => {
            const currentCategory = prev[categoryId] as NotificationChannelPreferences;
            return {
                ...prev,
                [categoryId]: {
                    ...currentCategory,
                    [channel]: value
                }
            };
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("profiles")
                .update({
                    notification_preferences: preferences as any
                })
                .eq("id", user.id);

            if (error) throw error;

            toast.success("Notification preferences saved!");
            setSaved(true);
            setHasChanges(false);

            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Error saving preferences:", error);
            toast.error("Failed to save preferences");
        } finally {
            setSaving(false);
        }
    };

    const enableAll = () => {
        const newPrefs = { ...preferences };
        categoryConfigs.forEach(cat => {
            if (newPrefs[cat.id]) {
                if (cat.hasEmail) newPrefs[cat.id].email = true;
                if (cat.hasPush) newPrefs[cat.id].push = true;
            }
        });
        setPreferences(newPrefs);
        setHasChanges(true);
    };

    const disableAll = () => {
        const newPrefs = { ...preferences };
        categoryConfigs.forEach(cat => {
            if (newPrefs[cat.id]) {
                newPrefs[cat.id].email = false;
                newPrefs[cat.id].push = false;
            }
        });
        setPreferences(newPrefs);
        setHasChanges(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-secondary-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-secondary-900">Notification Preferences</h3>
                        <p className="text-sm text-secondary-500 mt-1">
                            Choose how and when you want to be notified
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={enableAll}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                            Enable all
                        </button>
                        <span className="text-secondary-300">|</span>
                        <button
                            onClick={disableAll}
                            className="text-xs font-medium text-secondary-500 hover:text-secondary-700"
                        >
                            Disable all
                        </button>
                    </div>
                </div>
            </div>

            {/* Column Headers */}
            <div className="hidden sm:flex items-center justify-end gap-6 sm:gap-8 text-xs font-medium text-secondary-500 uppercase tracking-wide">
                <div className="flex items-center gap-1.5 w-16 justify-center">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                </div>
                <div className="flex items-center gap-1.5 w-16 justify-center">
                    <Smartphone className="h-3.5 w-3.5" />
                    Push
                </div>
            </div>

            {/* Notification Rows */}
            <div>
                {categoryConfigs.map((config) => (
                    <NotificationRow
                        key={config.id}
                        config={config}
                        preferences={preferences}
                        onEmailChange={(checked) => updatePreference(config.id, 'email', checked)}
                        onPushChange={(checked) => updatePreference(config.id, 'push', checked)}
                    />
                ))}
            </div>

            {/* Mobile Labels */}
            <div className="sm:hidden flex items-center justify-center gap-6 py-2 text-xs text-secondary-500">
                <span className="flex items-center gap-1">
                    <div className="w-8 h-4 rounded-full bg-secondary-200" />
                    = Email
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-8 h-4 rounded-full bg-secondary-200" />
                    = Push
                </span>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Push notifications require the Xocial mobile app or browser
                    notifications to be enabled on your device.
                </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                <div className="text-sm text-secondary-500">
                    {hasChanges && "You have unsaved changes"}
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="min-w-[140px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Saved!
                        </>
                    ) : (
                        "Save Preferences"
                    )}
                </Button>
            </div>
        </div>
    );
}
