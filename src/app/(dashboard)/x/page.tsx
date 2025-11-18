"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AccountCard } from "./components/account-card";
import { PostCard } from "./components/post-card";
import { CommentsMiniModal } from "./components/comments-mini-modal";
import { useAccounts } from "./hooks/useAccounts";
import { usePosts } from "./hooks/usePosts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Post } from "@/types";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function XPage() {
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [ownerFilter, setOwnerFilter] = useState<'me' | 'all'>('all');
  const { accounts, loading: accountsLoading, syncAccount, disconnectAccount } = useAccounts(undefined, {
    platform: platformFilter || undefined,
    status: statusFilter || undefined,
    owner: ownerFilter,
  });
  const { posts, loading: postsLoading, hasMore, loadMore } = usePosts();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showYouTubeReconnect, setShowYouTubeReconnect] = useState(true);
  const searchParams = useSearchParams();

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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">X — Accounts</h1>
            <p className="mt-2 text-secondary-600">Command center for all connected social accounts</p>
          </div>
          <Link
            href="/x/connect"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors px-6 py-3 text-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Account
          </Link>
        </div>
      </div>

      {/* Optional: YouTube reconnect banner for advanced analytics */}
      {showYouTubeReconnect && accounts.some((a) => a.platform === 'youtube') && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-blue-900">
                To enable advanced YouTube Analytics, please reconnect your YouTube account using the updated flow.
              </p>
              <p className="mt-1 text-xs text-blue-800">
                This adds the required permissions for detailed analytics reporting.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/api/oauth/connect?platform=youtube"
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Reconnect YouTube
              </a>
              <button
                className="text-sm text-blue-800 hover:underline"
                onClick={() => setShowYouTubeReconnect(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-secondary-900">
          Connected Accounts
        </h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as any)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter((e.target.value as any) || 'all')}
          >
            <option value="all">All Accounts</option>
            <option value="me">Assigned To Me</option>
          </select>
        </div>
        {accountsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-secondary-300 p-12 text-center">
            <p className="text-secondary-600 mb-4">No accounts connected yet</p>
            <Link href="/x/connect">
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                Connect Your First Account
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onSync={syncAccount}
                onDisconnect={disconnectAccount}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Posts Section */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-secondary-900">
          Recent Posts
        </h2>
        {postsLoading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-secondary-300 p-12 text-center">
            <p className="text-secondary-600">No posts yet</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onCommentsClick={setSelectedPost}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-8 text-center">
                <Button onClick={loadMore} variant="secondary" disabled={postsLoading}>
                  {postsLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Comments Modal */}
      {selectedPost && (
        <CommentsMiniModal
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
          post={selectedPost}
        />
      )}
    </div>
  );
}

