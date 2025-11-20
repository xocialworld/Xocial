"use client";

import { useState, useEffect } from "react";
import { Plus, LinkIcon } from "lucide-react";
import { AccountCard } from "./components/account-card";
import { PostsDrawer } from "./components/posts-drawer";
import { CommentsPanel } from "./components/comments-panel";
import { PlatformSelectionDialog } from "./components/platform-selection-dialog";
import { MultiSelect, type MultiSelectOption } from "./components/multi-select";
import { AccountGridSkeleton } from "./components/account-grid-skeleton";
import { AccountsErrorBoundary } from "./components/accounts-error-boundary";
import { useAccounts } from "./hooks/useAccounts";
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
  const { accounts, loading: accountsLoading, syncAccount, disconnectAccount } = useAccounts(undefined, {
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
      window.location.reload(); // Simple refresh - in production, update state directly
    },
    onAccountDelete: () => {
      window.location.reload();
    },
    onAccountInsert: () => {
      window.location.reload();
    },
  });

  // Calculate active accounts
  const activeAccounts = accounts.filter((a) => a.is_active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Enhanced Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              X – Accounts
            </h1>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground">
              Command center for all connected social accounts
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 w-full sm:w-auto"
            onClick={() => setShowConnectDialog(true)}
            aria-label="Connect new social media account"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Connect Account
          </Button>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
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
              className="text-sm font-medium text-muted-foreground mb-2 block"
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
            className="sm:ml-auto flex items-center gap-4 text-sm text-muted-foreground pt-2 sm:pt-0"
            role="status"
            aria-live="polite"
          >
            <span className="font-medium" aria-label={`${accounts.length} total accounts`}>
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
            <span aria-hidden="true">•</span>
            <span aria-label={`${activeAccounts} active accounts`}>
              {activeAccounts} active
            </span>
          </div>
        </div>
      </header>

      {/* Accounts Grid with Error Boundary */}
      <AccountsErrorBoundary>
        <section aria-label="Connected social media accounts">
          {accountsLoading ? (
            <div role="status" aria-label="Loading accounts">
              <AccountGridSkeleton count={6} />
            </div>
          ) : accounts.length === 0 ? (
            /* Enhanced Empty State */
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4" role="status">
              <div className="rounded-full bg-muted p-6 mb-6" aria-hidden="true">
                <LinkIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">No Accounts Connected</h2>
              <p className="text-muted-foreground mb-8 text-center max-w-md text-sm sm:text-base">
                Connect your first social media account to start managing your content from one place
              </p>
              <Button
                size="lg"
                className="gap-2 w-full sm:w-auto"
                onClick={() => setShowConnectDialog(true)}
                aria-label="Connect your first account"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Connect Your First Account
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {accounts.map((account) => (
                <div key={account.id} className="space-y-2" role="listitem">
                  <AccountCard
                    account={account}
                    onSync={syncAccount}
                    onDisconnect={disconnectAccount}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openPostsDrawer(account)}
                    aria-label={`View posts from ${account.account_name}`}
                  >
                    View Posts
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </AccountsErrorBoundary>

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
    </div>
  );
}
