"use client";

import { useState } from "react";
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

export default function XPage() {
  const { accounts, loading: accountsLoading, syncAccount, disconnectAccount } = useAccounts();
  const { posts, loading: postsLoading, hasMore, loadMore } = usePosts();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">
              Manage Accounts
            </h1>
            <p className="mt-2 text-secondary-600">
              Connect and manage all your social media accounts in one place
            </p>
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

      {/* Accounts Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-secondary-900">
          Connected Accounts
        </h2>
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

