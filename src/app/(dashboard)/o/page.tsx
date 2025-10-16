import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./components/calendar-view";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function OPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user's workspace
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user?.id)
    .single();
  
  // Fetch scheduled posts
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("workspace_id", workspaces?.id)
    .in("status", ["scheduled", "draft"])
    .order("scheduled_at", { ascending: true });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">
              Content Calendar
            </h1>
            <p className="mt-2 text-secondary-600">
              Plan and schedule your social media content
            </p>
          </div>
          <Link
            href="/c"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors px-6 py-3 text-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Schedule Post
          </Link>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView posts={posts || []} />
    </div>
  );
}

