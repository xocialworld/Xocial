import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all posts for user's workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Fetch posts
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(`
        *,
        post_analytics(*)
      `)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    return NextResponse.json({ data: posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, platforms, scheduled_at, status, media, tags, campaign_id } = body;

    // Validate required fields
    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "Content and platforms are required" },
        { status: 400 }
      );
    }

    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        workspace_id: workspace.id,
        content,
        platforms,
        status: status || "draft",
        scheduled_at,
        created_by: user.id,
        media: media || [],
        tags: tags || [],
        campaign_id,
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

