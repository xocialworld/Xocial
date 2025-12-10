"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Building2,
  Bell,
  CreditCard,
  Users,
  Share2,
  Settings,
  Shield,
} from "lucide-react";
import { AccountForm } from "@/components/settings/account-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { TeamMembers } from "@/components/settings/team-members";
import { IntegrationsList } from "@/components/settings/integrations-list";
import { BillingSettings } from "@/components/settings/billing-settings";
import { NotificationsForm } from "@/components/settings/notifications-form";
import {
  PageHeader,
  PageContainer,
} from "@/components/shared/page-components";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "workspace" | "team" | "integrations" | "notifications" | "billing" | "security";

const menuItems = [
  {
    id: "profile",
    label: "Profile",
    description: "Your personal information",
    icon: User,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Workspace configuration",
    icon: Building2,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    id: "team",
    label: "Team",
    description: "Manage members",
    icon: Users,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Connected services",
    icon: Share2,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alert preferences",
    icon: Bell,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Plans & payments",
    icon: CreditCard,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
  {
    id: "security",
    label: "Security",
    description: "Password & 2FA",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
] as const;

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get tab from URL, default to profile
  const tabParam = searchParams.get('tab');
  const validTab = menuItems.some(item => item.id === tabParam) ? tabParam as SettingsTab : "profile";

  const [activeTab, setActiveTab] = useState<SettingsTab>(validTab);
  const [profile, setProfile] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Sync activeTab from URL when tabParam changes
  useEffect(() => {
    const newValidTab = menuItems.some(item => item.id === tabParam) ? tabParam as SettingsTab : "profile";
    setActiveTab(newValidTab);
  }, [tabParam]);

  // Handle tab click - update URL
  const handleTabClick = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };

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

  const activeMenuItem = menuItems.find(item => item.id === activeTab);

  const renderContent = () => {
    if (loading) {
      return <SettingsSkeleton />;
    }

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
      case "security":
        return (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="pb-4 border-b border-secondary-100">
              <h3 className="font-semibold text-secondary-900">Security Settings</h3>
              <p className="text-sm text-secondary-500 mt-1">
                Manage your account security and authentication methods
              </p>
            </div>

            {/* Password Section */}
            <div className="border border-secondary-200 rounded-xl p-5">
              <h3 className="font-medium text-secondary-900 mb-1">Password</h3>
              <p className="text-sm text-secondary-500 mb-4">Update your password to keep your account secure</p>
              <button className="px-4 py-2 text-sm font-medium bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors">
                Change Password
              </button>
            </div>

            {/* 2FA Section */}
            <div className="border border-secondary-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-secondary-900 mb-1">Two-Factor Authentication</h3>
                  <p className="text-sm text-secondary-500 mb-4">Add an extra layer of security to your account</p>
                </div>
                <span className="text-xs px-2 py-1 bg-secondary-100 text-secondary-600 rounded-full">
                  Not enabled
                </span>
              </div>
              <button className="px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                Enable 2FA
              </button>
            </div>

            {/* Sessions Section */}
            <div className="border border-secondary-200 rounded-xl p-5">
              <h3 className="font-medium text-secondary-900 mb-1">Active Sessions</h3>
              <p className="text-sm text-secondary-500 mb-4">Manage devices where you're currently logged in</p>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">Current Session</p>
                      <p className="text-xs text-secondary-500">Browser • Last active now</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">This device</span>
                </div>
              </div>
              <button className="text-sm font-medium text-secondary-600 hover:text-secondary-900">
                Sign out all other sessions
              </button>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-100 bg-red-50/50 rounded-xl p-5">
              <h3 className="font-medium text-red-900 mb-1">Danger Zone</h3>
              <p className="text-sm text-red-600 mb-4">Permanently delete your account and all associated data</p>
              <button className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={Settings}
        iconColor="text-secondary-500"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden lg:sticky lg:top-20">
            {/* Mobile horizontal scroll / Desktop vertical */}
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible py-2 lg:py-3 px-2 lg:px-2 gap-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id as SettingsTab)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg transition-all duration-150 whitespace-nowrap flex-shrink-0",
                      isActive
                        ? `${item.bgColor}`
                        : "hover:bg-secondary-50"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive
                        ? "bg-white shadow-sm"
                        : "bg-secondary-100"
                    )}>
                      <item.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? item.color : "text-secondary-500"
                      )} />
                    </div>
                    <div className="hidden lg:block min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-secondary-900" : "text-secondary-700"
                      )}>
                        {item.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Tab Header */}
          {activeMenuItem && (
            <div className="flex items-center gap-3 mb-5">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                activeMenuItem.bgColor
              )}>
                <activeMenuItem.icon className={cn("h-5 w-5", activeMenuItem.color)} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900">{activeMenuItem.label}</h2>
                <p className="text-sm text-secondary-500">{activeMenuItem.description}</p>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 lg:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-secondary-600">Loading settings...</p>
          </div>
        </div>
      </PageContainer>
    }>
      <SettingsContent />
    </Suspense>
  );
}
