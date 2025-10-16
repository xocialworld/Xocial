"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Building2, Bell, Lock, CreditCard, Shield } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setName(profileData.name || "");
          setEmail(profileData.email || "");
          setBio(profileData.bio || "");
          setTimezone(profileData.timezone || "UTC");
        }

        // Fetch workspace
        const { data: workspaceData } = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (workspaceData) {
          setWorkspace(workspaceData);
          setWorkspaceName(workspaceData.name || "");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
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
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleWorkspaceUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      if (workspace) {
        // Update existing workspace
        const { error } = await supabase
          .from("workspaces")
          .update({
            name: workspaceName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workspace.id);

        if (error) throw error;
        toast.success("Workspace updated successfully!");
      } else {
        // Create new workspace
        const { error } = await supabase
          .from("workspaces")
          .insert({
            name: workspaceName,
            slug: workspaceName.toLowerCase().replace(/\s+/g, "-"),
            owner_id: user.id,
          });

        if (error) throw error;
        toast.success("Workspace created successfully!");
      }

      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
        <p className="mt-2 text-secondary-600">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 text-primary-700">
                  <User className="h-5 w-5" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-700 hover:bg-secondary-50">
                  <Building2 className="h-5 w-5" />
                  Workspace
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-700 hover:bg-secondary-50">
                  <Bell className="h-5 w-5" />
                  Notifications
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-700 hover:bg-secondary-50">
                  <Lock className="h-5 w-5" />
                  Security
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-700 hover:bg-secondary-50">
                  <CreditCard className="h-5 w-5" />
                  Billing
                </button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
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
                    {name.charAt(0).toUpperCase()}
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

          {/* Workspace Section */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>
                Manage your workspace configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Workspace Name
                </label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                />
              </div>

              {workspace && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Workspace ID
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={workspace.slug}
                      disabled
                      className="bg-secondary-50"
                    />
                    <Badge variant="info">Active</Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={handleWorkspaceUpdate}
                disabled={saving || !workspaceName.trim()}
                className="w-full"
              >
                {saving ? "Saving..." : workspace ? "Update Workspace" : "Create Workspace"}
              </Button>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>
                Your current plan and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary-600" />
                  <div>
                    <p className="font-medium text-secondary-900">Free Plan</p>
                    <p className="text-sm text-secondary-600">
                      All basic features included
                    </p>
                  </div>
                </div>
                <Button variant="primary">Upgrade</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

