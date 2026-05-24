'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  Bell,
  CreditCard,
  RefreshCw,
  Users,
  Share2,
  Settings,
  Shield,
} from 'lucide-react';
import { AccountForm } from '@/components/settings/account-form';
import { useHasHydrated, useSelectedWorkspace } from '@/store/workspaceStore';
import { WorkspaceForm } from '@/components/settings/workspace-form';
import { TeamManagement } from '@/components/settings/team-management';
import { IntegrationsList } from '@/components/settings/integrations-list';
import { BillingSettings } from '@/components/settings/billing-settings';
import { NotificationsForm } from '@/components/settings/notifications-form';
import { PageHeader, PageContainer } from '@/components/shared/page-components';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatOAuthErrorMessage, formatOAuthSuccessMessage } from '@/lib/oauth/messages';

type SettingsTab =
  | 'profile'
  | 'workspace'
  | 'team'
  | 'integrations'
  | 'notifications'
  | 'billing'
  | 'readiness'
  | 'security';

const menuItems = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your personal information',
    icon: User,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Workspace configuration',
    icon: Building2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'team',
    label: 'Team',
    description: 'Manage members',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connected services',
    icon: Share2,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alert preferences',
    icon: Bell,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Plans & payments',
    icon: CreditCard,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'readiness',
    label: 'Readiness',
    description: 'Demo health checks',
    icon: Activity,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Password & 2FA',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
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

function WorkspaceRequired() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary-200 bg-secondary-50 px-6 py-12 text-center">
      <Building2 className="h-10 w-10 text-secondary-300" />
      <h3 className="mt-4 font-semibold text-secondary-900">No workspace selected</h3>
      <p className="mt-2 max-w-md text-sm text-secondary-500">
        Select a workspace from the workspace switcher to manage this section.
      </p>
    </div>
  );
}

type ReadinessStatus = 'pass' | 'warn' | 'fail';

type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
};

type ReadinessPayload = {
  generatedAt: string;
  summary: {
    passed: number;
    warnings: number;
    failures: number;
    readyForDemo: boolean;
  };
  checks: ReadinessCheck[];
};

function ReadinessPanel({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState<ReadinessPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReadiness = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/readiness', {
        headers: { 'x-workspace-id': workspaceId },
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || json?.success === false) {
        throw new Error(json?.error?.message || 'Failed to load readiness checks');
      }

      setPayload(json.data || json);
      setError(null);
    } catch (requestError: any) {
      setError(requestError.message || 'Failed to load readiness checks');
      setPayload(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const statusStyles: Record<ReadinessStatus, string> = {
    pass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
    fail: 'border-red-200 bg-red-50 text-red-700',
  };

  const statusIcon: Record<ReadinessStatus, typeof CheckCircle2> = {
    pass: CheckCircle2,
    warn: AlertTriangle,
    fail: AlertTriangle,
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-semibold">Readiness checks failed</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void loadReadiness()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const checks = payload?.checks || [];
  const summary = payload?.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-secondary-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-secondary-900">Workspace readiness</h3>
          <p className="mt-1 text-sm text-secondary-500">
            Operational checks for publishing, scheduling, OAuth, storage, and demo safety.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReadiness()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-secondary-200 p-3">
            <p className="text-xs text-secondary-500">Demo state</p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold',
                summary.readyForDemo ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {summary.readyForDemo ? 'Ready' : 'Blocked'}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Passed</p>
            <p className="mt-1 text-xl font-semibold text-emerald-800">{summary.passed}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Warnings</p>
            <p className="mt-1 text-xl font-semibold text-amber-800">{summary.warnings}</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-xs text-red-700">Failures</p>
            <p className="mt-1 text-xl font-semibold text-red-800">{summary.failures}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {checks.map((check) => {
          const StatusIcon = statusIcon[check.status] || AlertTriangle;

          return (
            <div key={check.id} className="rounded-lg border border-secondary-200 p-4">
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 rounded-full border p-1.5', statusStyles[check.status])}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-secondary-900">{check.label}</h4>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium uppercase',
                        statusStyles[check.status]
                      )}
                    >
                      {check.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-secondary-600">{check.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {payload?.generatedAt && (
        <p className="text-xs text-secondary-400">
          Last checked {new Date(payload.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get tab from URL, default to profile
  const tabParam = searchParams.get('tab');
  const validTab = menuItems.some((item) => item.id === tabParam)
    ? (tabParam as SettingsTab)
    : 'profile';

  const [activeTab, setActiveTab] = useState<SettingsTab>(validTab);
  const [profile, setProfile] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const selectedWorkspace = useSelectedWorkspace();
  const hasHydrated = useHasHydrated();
  const selectedWorkspaceId = selectedWorkspace?.id;

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const accounts = searchParams.get('accounts');

    if (success) {
      toast.success(formatOAuthSuccessMessage(success, accounts));
    }

    if (error) {
      toast.error(formatOAuthErrorMessage(error));
    }

    if (success || error) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('success');
      params.delete('error');
      params.delete('accounts');
      const query = params.toString();
      router.replace(`/settings${query ? `?${query}` : ''}`, { scroll: false });
    }
  }, [router, searchParams]);

  // Sync activeTab from URL when tabParam changes
  useEffect(() => {
    const newValidTab = menuItems.some((item) => item.id === tabParam)
      ? (tabParam as SettingsTab)
      : 'profile';
    setActiveTab(newValidTab);
  }, [tabParam]);

  // Handle tab click - update URL
  const handleTabClick = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };
  const fetchData = useCallback(async () => {
    if (!hasHydrated) {
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setWorkspace(null);
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      if (!selectedWorkspaceId) {
        setWorkspace(null);
        return;
      }

      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', selectedWorkspaceId)
        .maybeSingle();

      setWorkspace(workspaceData ?? null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [hasHydrated, supabase, selectedWorkspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeMenuItem = menuItems.find((item) => item.id === activeTab);

  const renderContent = () => {
    if (loading) {
      return <SettingsSkeleton />;
    }

    const requiresSelectedWorkspace =
      activeTab === 'team' ||
      activeTab === 'integrations' ||
      activeTab === 'billing' ||
      activeTab === 'readiness';

    if (requiresSelectedWorkspace && !selectedWorkspaceId) {
      return <WorkspaceRequired />;
    }

    switch (activeTab) {
      case 'profile':
        return <AccountForm profile={profile} onUpdate={fetchData} />;
      case 'workspace':
        return <WorkspaceForm workspace={workspace} onUpdate={fetchData} />;
      case 'team':
        return <TeamManagement />;
      case 'integrations':
        return <IntegrationsList workspaceId={selectedWorkspaceId!} />;
      case 'notifications':
        return <NotificationsForm />;
      case 'billing':
        return <BillingSettings workspaceId={selectedWorkspaceId!} />;
      case 'readiness':
        return <ReadinessPanel workspaceId={selectedWorkspaceId!} />;
      case 'security':
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
              <p className="text-sm text-secondary-500 mb-4">
                Update your password to keep your account secure
              </p>
              <button className="px-4 py-2 text-sm font-medium bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors">
                Change Password
              </button>
            </div>

            {/* 2FA Section */}
            <div className="border border-secondary-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-secondary-900 mb-1">Two-Factor Authentication</h3>
                  <p className="text-sm text-secondary-500 mb-4">
                    Add an extra layer of security to your account
                  </p>
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
              <p className="text-sm text-secondary-500 mb-4">
                Manage devices where you&apos;re currently logged in
              </p>
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
              <p className="text-sm text-red-600 mb-4">
                Permanently delete your account and all associated data
              </p>
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
                      'flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg transition-all duration-150 whitespace-nowrap flex-shrink-0',
                      isActive ? `${item.bgColor}` : 'hover:bg-secondary-50'
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                        isActive ? 'bg-white shadow-sm' : 'bg-secondary-100'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 transition-colors',
                          isActive ? item.color : 'text-secondary-500'
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isActive ? 'text-secondary-900' : 'text-secondary-700'
                        )}
                      >
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
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  activeMenuItem.bgColor
                )}
              >
                <activeMenuItem.icon className={cn('h-5 w-5', activeMenuItem.color)} />
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
    <Suspense
      fallback={
        <PageContainer>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-secondary-600">Loading settings...</p>
            </div>
          </div>
        </PageContainer>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
