"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, Check, Globe, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountFormProps {
    profile: any;
    onUpdate: () => void;
}

// Common timezones for quick selection
const TIMEZONES = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: "+00:00" },
    { value: "America/New_York", label: "Eastern Time", offset: "-05:00" },
    { value: "America/Chicago", label: "Central Time", offset: "-06:00" },
    { value: "America/Denver", label: "Mountain Time", offset: "-07:00" },
    { value: "America/Los_Angeles", label: "Pacific Time", offset: "-08:00" },
    { value: "Europe/London", label: "London (GMT)", offset: "+00:00" },
    { value: "Europe/Paris", label: "Paris (CET)", offset: "+01:00" },
    { value: "Europe/Berlin", label: "Berlin (CET)", offset: "+01:00" },
    { value: "Asia/Dubai", label: "Dubai (GST)", offset: "+04:00" },
    { value: "Asia/Kolkata", label: "India (IST)", offset: "+05:30" },
    { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "+08:00" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "+09:00" },
    { value: "Australia/Sydney", label: "Sydney (AEDT)", offset: "+11:00" },
];

function FormGroup({
    label,
    description,
    required = false,
    children
}: {
    label: string;
    description?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm font-medium text-secondary-900">
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {description && (
                <p className="text-xs text-secondary-500">{description}</p>
            )}
        </div>
    );
}

export function AccountForm({ profile, onUpdate }: AccountFormProps) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [name, setName] = useState(profile?.name || "");
    const [email] = useState(profile?.email || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [timezone, setTimezone] = useState(profile?.timezone || "UTC");
    const supabase = createClient();

    const handleProfileUpdate = useCallback(async () => {
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }

        setSaving(true);
        setSaved(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("profiles")
                .update({
                    name: name.trim(),
                    bio: bio.trim(),
                    timezone,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (error) throw error;

            toast.success("Profile updated successfully!");
            setSaved(true);
            onUpdate();

            // Reset saved state after 2 seconds
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    }, [supabase, name, bio, timezone, onUpdate]);

    const hasChanges = name !== (profile?.name || "") ||
        bio !== (profile?.bio || "") ||
        timezone !== (profile?.timezone || "UTC");

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
                <h3 className="font-semibold text-secondary-900">Profile Information</h3>
                <p className="text-sm text-secondary-500 mt-1">
                    Update your profile details and how you appear to your team
                </p>
            </div>

            {/* Avatar Section */}
            <div className="flex items-center gap-5">
                <div className="relative group">
                    <Avatar className="h-20 w-20 ring-4 ring-secondary-100">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                            {name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-5 w-5 text-white" />
                    </button>
                </div>
                <div>
                    <Button variant="outline" size="sm">
                        Change Photo
                    </Button>
                    <p className="mt-1.5 text-xs text-secondary-500">
                        JPG, PNG or GIF. Max 2MB.
                    </p>
                </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-5 sm:grid-cols-2">
                <FormGroup label="Full Name" required>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="h-10"
                    />
                </FormGroup>

                <FormGroup label="Email Address" description="Contact support to change your email">
                    <Input
                        value={email}
                        disabled
                        className="h-10 bg-secondary-50 text-secondary-500"
                    />
                </FormGroup>
            </div>

            <FormGroup label="Bio" description="Brief description for your profile. Max 160 characters.">
                <textarea
                    className={cn(
                        "w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg resize-none",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                        "placeholder:text-secondary-400 transition-colors"
                    )}
                    rows={3}
                    maxLength={160}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a bit about yourself..."
                />
                <div className="flex justify-end">
                    <span className={cn(
                        "text-xs",
                        bio.length > 140 ? "text-orange-500" : "text-secondary-400"
                    )}>
                        {bio.length}/160
                    </span>
                </div>
            </FormGroup>

            <FormGroup label="Timezone" description="Used for scheduling and displaying times">
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <select
                        className={cn(
                            "w-full h-10 pl-10 pr-4 text-sm border border-secondary-200 rounded-lg appearance-none",
                            "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                            "bg-white transition-colors"
                        )}
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                    >
                        {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                                {tz.label} (UTC{tz.offset})
                            </option>
                        ))}
                    </select>
                </div>
            </FormGroup>

            {/* Current Time Preview */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary-50 rounded-lg">
                <Clock className="h-4 w-4 text-secondary-500" />
                <span className="text-sm text-secondary-600">
                    Current time in {TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}:{" "}
                    <strong>
                        {new Date().toLocaleTimeString('en-US', {
                            timeZone: timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </strong>
                </span>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                <div className="text-sm text-secondary-500">
                    {hasChanges && "You have unsaved changes"}
                </div>
                <Button
                    onClick={handleProfileUpdate}
                    disabled={saving || !hasChanges}
                    className="min-w-[120px]"
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
                        "Save Changes"
                    )}
                </Button>
            </div>
        </div>
    );
}
