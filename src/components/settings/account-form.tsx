"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AccountFormProps {
    profile: any;
    onUpdate: () => void;
}

export function AccountForm({ profile, onUpdate }: AccountFormProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(profile?.name || "");
    const [email] = useState(profile?.email || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [timezone, setTimezone] = useState(profile?.timezone || "UTC");
    const supabase = createClient();

    const handleProfileUpdate = useCallback(async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("profiles")
                .update({
                    name,
                    bio,
                    timezone,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (error) throw error;

            toast.success("Profile updated successfully!");
            onUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    }, [supabase, name, bio, timezone, onUpdate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                    Update your profile information and how others see you
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-lg bg-primary-100 text-primary-700">
                            {name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <Button variant="secondary" size="sm">
                            Change Avatar
                        </Button>
                        <p className="mt-1 text-xs text-secondary-500">
                            JPG, PNG or GIF. Max size 2MB.
                        </p>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Full Name
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Email Address
                    </label>
                    <Input
                        value={email}
                        disabled
                        className="bg-secondary-50"
                    />
                    <p className="mt-1 text-xs text-secondary-500">
                        Email cannot be changed
                    </p>
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Bio
                    </label>
                    <textarea
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                    />
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Timezone
                    </label>
                    <select
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                    >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                    </select>
                </div>

                <Button
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="w-full"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </CardContent>
        </Card>
    );
}
