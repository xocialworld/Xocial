"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { User, Building2, Bell, Lock, CreditCard, Users, Share2 } from "lucide-react";
import { AccountForm } from "@/components/settings/account-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { TeamMembers } from "@/components/settings/team-members";
import { IntegrationsList } from "@/components/settings/integrations-list";
import { BillingSettings } from "@/components/settings/billing-settings";
import { NotificationsForm } from "@/components/settings/notifications-form";

type SettingsTab = "profile" | "workspace" | "team" | "integrations" | "notifications" | "billing";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
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
        }

        // Fetch workspace
        const { data: workspaceData } = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (workspaceData) {
          setWorkspace(workspaceData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <AccountForm profile={profile} onUpdate={fetchData} />;
      case "workspace":
        return <WorkspaceForm workspace={workspace} onUpdate={fetchData} />;
      case "team":
        return <TeamMembers workspaceId={workspace?.id} />;
      case "integrations":
        return <IntegrationsList workspaceId={workspace?.id} />;
      case "notifications":
        return <NotificationsForm />;
      case "billing":
        return <BillingSettings workspaceId={workspace?.id} />;
      default:
        return null;
    }
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "workspace", label: "Workspace", icon: Building2 },
    { id: "team", label: "Team Members", icon: Users },
    { id: "integrations", label: "Integrations", icon: Share2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing", icon: CreditCard },
  ] as const;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
        <p className="mt-2 text-secondary-600">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3">
          <Card className="sticky top-8">
            <CardContent className="p-3">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as SettingsTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === item.id
                        ? "bg-primary-50 text-primary-700"
                        : "text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900"
                      }`}
                  >
                    <item.icon className={`h-5 w-5 ${activeTab === item.id ? "text-primary-600" : "text-secondary-500"}`} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

