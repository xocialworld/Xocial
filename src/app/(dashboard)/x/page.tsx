import { createClient } from "@/lib/supabase/server";
import { AccountsGrid } from "./components/accounts-grid";
import { RecentPosts } from "./components/recent-posts";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function XPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user's workspace
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user?.id)
    .single();
  
  // Fetch social accounts
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("workspace_id", workspaces?.id)
    .eq("is_active", true);

  // Fetch recent posts
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      post_analytics(*)
    `)
    .eq("workspace_id", workspaces?.id)
    .order("created_at", { ascending: false })
    .limit(12);

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
        <AccountsGrid accounts={accounts || []} />
      </section>

      {/* Recent Posts Section */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-secondary-900">
          Recent Posts
        </h2>
        <RecentPosts posts={posts || []} />
      </section>
    </div>
  );
}

