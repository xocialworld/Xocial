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

interface NotificationPreference {
    id: string;
    label: string;
    description: string;
    icon: any;
    email: boolean;
    push: boolean;
}

const defaultPreferences: NotificationPreference[] = [
    {
        id: "approvals",
        label: "Approval Requests",
        description: "When content needs your review and approval",
        icon: CheckCircle2,
        email: true,
        push: true,
    },
    {
        id: "comments",
        label: "Comments & Mentions",
        description: "When someone comments on or mentions your content",
        icon: MessageSquare,
        email: true,
        push: true,
    },
    {
        id: "publishing",
        label: "Publishing Status",
        description: "When posts are published successfully or fail",
        icon: Send,
        email: true,
        push: false,
    },
    {
        id: "analytics",
        label: "Weekly Analytics",
        description: "Weekly summary of your social media performance",
        icon: Bell,
        email: true,
        push: false,
    },
    {
        id: "marketing",
        label: "Product Updates",
        description: "News about Xocial features and improvements",
        icon: Megaphone,
        email: false,
        push: false,
    },
];

function NotificationRow({
    preference,
    onEmailChange,
    onPushChange
}: {
    preference: NotificationPreference;
    onEmailChange: (checked: boolean) => void;
    onPushChange: (checked: boolean) => void;
}) {
    const Icon = preference.icon;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-secondary-100 last:border-0">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-secondary-600" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-secondary-900">{preference.label}</p>
                    <p className="text-sm text-secondary-500 line-clamp-1">{preference.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 pl-12 sm:pl-0">
                <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                        checked={preference.email}
                        onCheckedChange={onEmailChange}
                    />
                    <span className="text-xs font-medium text-secondary-600 hidden sm:inline">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                        checked={preference.push}
                        onCheckedChange={onPushChange}
                    />
                    <span className="text-xs font-medium text-secondary-600 hidden sm:inline">Push</span>
                </label>
            </div>
        </div>
    );
}

export function NotificationsForm() {
    const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const updatePreference = (id: string, field: 'email' | 'push', value: boolean) => {
        setPreferences(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        toast.success("Notification preferences saved!");
        setSaving(false);
        setSaved(true);
        setHasChanges(false);

        setTimeout(() => setSaved(false), 2000);
    };

    const enableAll = () => {
        setPreferences(prev => prev.map(p => ({ ...p, email: true, push: true })));
        setHasChanges(true);
    };

    const disableAll = () => {
        setPreferences(prev => prev.map(p => ({ ...p, email: false, push: false })));
        setHasChanges(true);
    };

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
                {preferences.map((preference) => (
                    <NotificationRow
                        key={preference.id}
                        preference={preference}
                        onEmailChange={(checked) => updatePreference(preference.id, 'email', checked)}
                        onPushChange={(checked) => updatePreference(preference.id, 'push', checked)}
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
