create or replace view public.teams as
  select id, name, slug, logo_url, owner_id, settings, created_at, updated_at
  from public.workspaces;

create or replace view public.team_memberships as
  select id, workspace_id as team_id, user_id, role, permissions, joined_at
  from public.workspace_members;

create or replace view public.scheduled_posts as
  select p.* from public.posts p
  where p.status in ('draft','pending_approval','approved','scheduled','published','failed');