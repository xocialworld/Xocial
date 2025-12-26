"use client";

import { useState, useEffect } from "react";
import { Plus, LinkIcon, Users, RefreshCw } from "lucide-react";
import { AccountCard } from "./components/account-card";
import { PostsDrawer } from "./components/posts-drawer";
import { CommentsPanel } from "./components/comments-panel";
import { PlatformSelectionDialog } from "./components/platform-selection-dialog";
import { MultiSelect, type MultiSelectOption } from "./components/multi-select";
import { AccountGridSkeleton } from "./components/account-grid-skeleton";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ErrorState } from "@/components/shared/error-state";
import {
  PageHeader,
  PageContainer,
  ContentCard,
  EmptyState,
  FilterChip
} from "@/components/shared/page-components";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountSync } from "@/hooks/use-account-sync";
import { useAccountsStore } from "@/store/accounts-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformNames, type Platform } from "@/lib/platform-colors";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Platform options for multi-select filter
const platformOptions: MultiSelectOption[] = Object.entries(platformNames).map(
  ([value, label]) => ({
    value,
    label,
  })
);

export default function XPage() {
  const searchParams = useSearchParams();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Zustand store
  const {
    filterPlatform,
    filterStatus,
    setFilterPlatform,
    setFilterStatus,
    selectedAccount,
    isPostsDrawerOpen,
    isCommentsOpen,
    selectedPost,
    openPostsDrawer,
    closePostsDrawer,
    closeComments,
  } = useAccountsStore();

  // Fetch accounts with filters
  // Fetch accounts with filters
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
    syncAccount,
    disconnectAccount
  } = useAccounts({
    platform: filterPlatform.length > 0 ? filterPlatform.join(',') : undefined,
    status: filterStatus.length > 0 ? (filterStatus[0] as any) : undefined,
  });

  // Handle success/error messages from OAuth redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      toast.success(success);
    }
    if (error) {
      toast.error(error);
    }
    if (success || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Real-time sync for account updates
  useAccountSync({
    workspaceId: accounts[0]?.workspace_id,
    onAccountUpdate: () => {
      refetchAccounts();
    },
    onAccountDelete: () => {
      refetchAccounts();
    },
    onAccountInsert: () => {
      refetchAccounts();
    },
  });

  // Calculate active accounts
  const activeAccounts = accounts.filter((a) => a.is_active).length;

  return (
    <PageContainer>
      {/* Enhanced Header */}
      <PageHeader
        shortCode="X"
        title="Accounts"
        description="Command center for all connected social accounts"
        icon={Users}
        iconColor="text-blue-500"
        badge={accountsLoading ? undefined : {
          label: `${activeAccounts} active`,
          variant: activeAccounts > 0 ? 'success' : 'default'
        }}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAccounts()}
              className="gap-2"
              aria-label="Refresh accounts"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="default"
              className="gap-2"
              onClick={() => setShowConnectDialog(true)}
              aria-label="Connect new social media account"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Connect Account</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          </div>
        }
      />

      {/* Enhanced Filters */}
      <ContentCard className="mb-6" padding="md">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          {/* Platform multi-select */}
          <MultiSelect
            label="Platforms"
            options={platformOptions}
            selected={filterPlatform}
            onChange={setFilterPlatform}
            placeholder="All Platforms"
          />

          {/* Status select */}
          <div className="flex-shrink-0">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-secondary-600 mb-2 block"
            >
              Status
            </label>
            <Select
              value={filterStatus[0] || ""}
              onValueChange={(value) => setFilterStatus(value ? [value] : [])}
            >
              <SelectTrigger className="w-full sm:w-[180px]" id="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick stats */}
          <div
            className="sm:ml-auto flex items-center gap-4 text-sm text-secondary-500 py-2"
            role="status"
            aria-live="polite"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-secondary-400" />
              <span className="font-medium">{accounts.length}</span> total
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{activeAccounts}</span> active
            </span>
          </div>
        </div>
      </ContentCard>

      {/* Accounts Grid with Error Boundary */}
      <ErrorBoundary onReset={refetchAccounts}>
        <section aria-label="Connected social media accounts">
          {accountsError ? (
            <ContentCard>
              <ErrorState
                message={accountsError.message || 'Failed to load accounts'}
                onRetry={refetchAccounts}
              />
            </ContentCard>
          ) : accountsLoading ? (
            <div role="status" aria-label="Loading accounts">
              <AccountGridSkeleton count={6} />
            </div>
          ) : accounts.length === 0 ? (
            <ContentCard>
              <EmptyState
                icon={LinkIcon}
                title="No Accounts Connected"
                description="Connect your first social media account to start managing your content from one place"
                action={{
                  label: "Connect Your First Account",
                  onClick: () => setShowConnectDialog(true),
                  icon: Plus
                }}
              />
            </ContentCard>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr" role="list">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onSync={syncAccount}
                  onDisconnect={disconnectAccount}
                  onViewPosts={openPostsDrawer}
                />
              ))}
            </div>
          )}
        </section>
      </ErrorBoundary>

      {/* Platform Selection Dialog */}
      <PlatformSelectionDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
      />

      {/* Posts Drawer */}
      <PostsDrawer
        account={selectedAccount}
        isOpen={isPostsDrawerOpen}
        onClose={closePostsDrawer}
        onPostClick={(post) => {
          useAccountsStore.getState().openComments(post);
        }}
      />

      {/* Comments Panel */}
      <CommentsPanel
        post={selectedPost}
        isOpen={isCommentsOpen}
        onClose={closeComments}
        platform={(selectedAccount?.platform as any) || 'instagram'}
      />
    </PageContainer>
  );
}
