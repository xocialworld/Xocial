import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  // Validate user access to workspace
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    // Check if owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
      
    if (!workspace || workspace.owner_id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized access to workspace' }, { status: 403 });
    }
  }

  // Build query
  // We need to fetch posts that fall within the start/end range based on 
  // scheduled_at, published_at, or created_at (in that order of preference)
  
  // Since Supabase/PostgREST doesn't easily support complex COALESCE filtering in the query builder
  // without RPC, and OR logic can be tricky with precedence, 
  // we will fetch a slightly broader set (e.g. anything with scheduled/published/created in range)
  // or just fetch for the workspace and filter in memory if we assume reasonable volume per month.
  // However, for scalability, let's try to use .or() if possible, or just filter by workspace 
  // and limit fields, then filter in JS.
  // 
  // Given the "Ground-Up" nature, let's start with fetching by workspace and filtering in memory 
  // but selecting only necessary fields for the calendar to keep it light.

  let query = supabase
    .from('posts')
    .select(`
      id,
      content,
      platforms,
      status,
      scheduled_at,
      published_at,
      created_at,
      media,
      workspace_id,
      updated_at
    `)
    .eq('workspace_id', workspaceId);

  // Apply strict date filtering if start/end provided
  // Note: This fetches all workspace posts. For production with thousands of posts, 
  // we should add an RPC function `get_calendar_posts(workspace_id, start_date, end_date)`.
  // For now, we'll filter in memory.

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filteredPosts = posts || [];

  if (start && end) {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();

    filteredPosts = filteredPosts.filter(post => {
      const dateStr = post.scheduled_at || post.published_at || post.created_at;
      if (!dateStr) return false;
      const date = new Date(dateStr).getTime();
      return date >= startDate && date <= endDate;
    });
  }

  return NextResponse.json({ posts: filteredPosts });
}
