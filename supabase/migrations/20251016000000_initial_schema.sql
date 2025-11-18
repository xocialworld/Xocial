-- XOCIAL DATABASE SCHEMA
-- Migration: Initial Schema
-- Created: 2025-10-16
-- Description: Complete database schema with RLS policies, indexes, and real-time
-- 
-- IMPORTANT: This migration is FULLY IDEMPOTENT and can be safely run multiple times!
-- - Creates tables/indexes only if they don't exist
-- - Adds missing columns to existing tables
-- - Drops and recreates all policies, triggers, and realtime subscriptions
-- - Safe to run on fresh databases or partially migrated databases

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE 1: PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{"push": true, "email": true, "in_app": true, "digest_frequency": "daily"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: WORKSPACES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 3: WORKSPACE_MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'client')),
    permissions JSONB DEFAULT '[]'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- TABLE 4: SOCIAL_ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube')),
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_avatar TEXT,
    account_handle TEXT,
    follower_count INTEGER DEFAULT 0,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, platform, account_id)
);

-- ============================================================================
-- TABLE 5: POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
    external_post_id TEXT,
    content JSONB NOT NULL,
    platforms TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    campaign_id UUID,
    media JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 6: POST_ANALYTICS (renamed from engagement_metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, platform, fetched_at)
);

-- ============================================================================
-- TABLE 7: COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    external_comment_id TEXT,
    platform TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_id TEXT,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    is_reply BOOLEAN DEFAULT false,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 8: AI_GENERATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    platform TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    model TEXT DEFAULT 'gpt-4',
    tokens_used INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    parameters JSONB DEFAULT '{}'::jsonb,
    feedback TEXT CHECK (feedback IN ('positive', 'negative', 'neutral')),
    was_used BOOLEAN DEFAULT false,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 9: STRATEGY_RECOMMENDATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.strategy_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('content', 'timing', 'engagement', 'growth', 'hashtag', 'topic')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    metrics JSONB DEFAULT '{}'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'dismissed')),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    implemented_at TIMESTAMPTZ,
    implemented_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 10: API_CALL_LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 11: CAMPAIGNS (Additional table for content organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    start_date DATE,
    end_date DATE,
    goal TEXT,
    budget DECIMAL(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add campaign_id foreign key to posts (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_posts_campaign'
    ) THEN
        ALTER TABLE public.posts 
            ADD CONSTRAINT fk_posts_campaign 
            FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- ENSURE ALL COLUMNS EXIST (for existing tables from partial migrations)
-- ============================================================================
-- This comprehensive section ensures all columns exist on all tables
-- Safe to run multiple times - only adds missing columns

-- PROFILES TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
            ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
            ALTER TABLE public.profiles ADD COLUMN name TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
            ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
            ALTER TABLE public.profiles ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'timezone') THEN
            ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'notification_preferences') THEN
            ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"push": true, "email": true, "in_app": true, "digest_frequency": "daily"}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
            ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
            ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- WORKSPACES TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'name') THEN
            ALTER TABLE public.workspaces ADD COLUMN name TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'slug') THEN
            ALTER TABLE public.workspaces ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'logo_url') THEN
            ALTER TABLE public.workspaces ADD COLUMN logo_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'settings') THEN
            ALTER TABLE public.workspaces ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'created_at') THEN
            ALTER TABLE public.workspaces ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'updated_at') THEN
            ALTER TABLE public.workspaces ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- WORKSPACE_MEMBERS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'role') THEN
            ALTER TABLE public.workspace_members ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'permissions') THEN
            ALTER TABLE public.workspace_members ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'joined_at') THEN
            ALTER TABLE public.workspace_members ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- SOCIAL_ACCOUNTS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_accounts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'platform') THEN
            ALTER TABLE public.social_accounts ADD COLUMN platform TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'account_id') THEN
            ALTER TABLE public.social_accounts ADD COLUMN account_id TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'account_name') THEN
            ALTER TABLE public.social_accounts ADD COLUMN account_name TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'account_avatar') THEN
            ALTER TABLE public.social_accounts ADD COLUMN account_avatar TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'account_handle') THEN
            ALTER TABLE public.social_accounts ADD COLUMN account_handle TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'follower_count') THEN
            ALTER TABLE public.social_accounts ADD COLUMN follower_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'access_token') THEN
            ALTER TABLE public.social_accounts ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'refresh_token') THEN
            ALTER TABLE public.social_accounts ADD COLUMN refresh_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'token_expires_at') THEN
            ALTER TABLE public.social_accounts ADD COLUMN token_expires_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'connected_at') THEN
            ALTER TABLE public.social_accounts ADD COLUMN connected_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'last_synced_at') THEN
            ALTER TABLE public.social_accounts ADD COLUMN last_synced_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'is_active') THEN
            ALTER TABLE public.social_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'metadata') THEN
            ALTER TABLE public.social_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'created_at') THEN
            ALTER TABLE public.social_accounts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_accounts' AND column_name = 'updated_at') THEN
            ALTER TABLE public.social_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- POSTS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'external_post_id') THEN
            ALTER TABLE public.posts ADD COLUMN external_post_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'content') THEN
            ALTER TABLE public.posts ADD COLUMN content JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'platforms') THEN
            ALTER TABLE public.posts ADD COLUMN platforms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'status') THEN
            ALTER TABLE public.posts ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'scheduled_at') THEN
            ALTER TABLE public.posts ADD COLUMN scheduled_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'published_at') THEN
            ALTER TABLE public.posts ADD COLUMN published_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'campaign_id') THEN
            ALTER TABLE public.posts ADD COLUMN campaign_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'media') THEN
            ALTER TABLE public.posts ADD COLUMN media JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'tags') THEN
            ALTER TABLE public.posts ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'error_message') THEN
            ALTER TABLE public.posts ADD COLUMN error_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'metadata') THEN
            ALTER TABLE public.posts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'created_at') THEN
            ALTER TABLE public.posts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'updated_at') THEN
            ALTER TABLE public.posts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- POST_ANALYTICS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_analytics') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'platform') THEN
            ALTER TABLE public.post_analytics ADD COLUMN platform TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'impressions') THEN
            ALTER TABLE public.post_analytics ADD COLUMN impressions INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'reach') THEN
            ALTER TABLE public.post_analytics ADD COLUMN reach INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'engagement') THEN
            ALTER TABLE public.post_analytics ADD COLUMN engagement INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'likes') THEN
            ALTER TABLE public.post_analytics ADD COLUMN likes INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'comments') THEN
            ALTER TABLE public.post_analytics ADD COLUMN comments INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'shares') THEN
            ALTER TABLE public.post_analytics ADD COLUMN shares INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'saves') THEN
            ALTER TABLE public.post_analytics ADD COLUMN saves INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'clicks') THEN
            ALTER TABLE public.post_analytics ADD COLUMN clicks INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'video_views') THEN
            ALTER TABLE public.post_analytics ADD COLUMN video_views INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'engagement_rate') THEN
            ALTER TABLE public.post_analytics ADD COLUMN engagement_rate DECIMAL(5,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'fetched_at') THEN
            ALTER TABLE public.post_analytics ADD COLUMN fetched_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'created_at') THEN
            ALTER TABLE public.post_analytics ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_analytics' AND column_name = 'updated_at') THEN
            ALTER TABLE public.post_analytics ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- COMMENTS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'external_comment_id') THEN
            ALTER TABLE public.comments ADD COLUMN external_comment_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'platform') THEN
            ALTER TABLE public.comments ADD COLUMN platform TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'author_name') THEN
            ALTER TABLE public.comments ADD COLUMN author_name TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'author_avatar') THEN
            ALTER TABLE public.comments ADD COLUMN author_avatar TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'author_id') THEN
            ALTER TABLE public.comments ADD COLUMN author_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'content') THEN
            ALTER TABLE public.comments ADD COLUMN content TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'parent_comment_id') THEN
            ALTER TABLE public.comments ADD COLUMN parent_comment_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'likes') THEN
            ALTER TABLE public.comments ADD COLUMN likes INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'reply_count') THEN
            ALTER TABLE public.comments ADD COLUMN reply_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'is_reply') THEN
            ALTER TABLE public.comments ADD COLUMN is_reply BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'sentiment') THEN
            ALTER TABLE public.comments ADD COLUMN sentiment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'created_at') THEN
            ALTER TABLE public.comments ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'updated_at') THEN
            ALTER TABLE public.comments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- AI_GENERATIONS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_generations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'prompt') THEN
            ALTER TABLE public.ai_generations ADD COLUMN prompt TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'platform') THEN
            ALTER TABLE public.ai_generations ADD COLUMN platform TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'generated_content') THEN
            ALTER TABLE public.ai_generations ADD COLUMN generated_content JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'model') THEN
            ALTER TABLE public.ai_generations ADD COLUMN model TEXT DEFAULT 'gpt-4';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'tokens_used') THEN
            ALTER TABLE public.ai_generations ADD COLUMN tokens_used INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'generation_time_ms') THEN
            ALTER TABLE public.ai_generations ADD COLUMN generation_time_ms INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'parameters') THEN
            ALTER TABLE public.ai_generations ADD COLUMN parameters JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'feedback') THEN
            ALTER TABLE public.ai_generations ADD COLUMN feedback TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'was_used') THEN
            ALTER TABLE public.ai_generations ADD COLUMN was_used BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'post_id') THEN
            ALTER TABLE public.ai_generations ADD COLUMN post_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_generations' AND column_name = 'created_at') THEN
            ALTER TABLE public.ai_generations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- STRATEGY_RECOMMENDATIONS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'strategy_recommendations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'type') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN type TEXT NOT NULL DEFAULT 'content';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'title') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN title TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'description') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN description TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'priority') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN priority TEXT DEFAULT 'medium';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'confidence_score') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.5;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'metrics') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN metrics JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'action_items') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN action_items JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'status') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'valid_from') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN valid_from TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'valid_until') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN valid_until TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'implemented_at') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN implemented_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'results') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN results JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'created_at') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'strategy_recommendations' AND column_name = 'updated_at') THEN
            ALTER TABLE public.strategy_recommendations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- API_CALL_LOGS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_call_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'endpoint') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN endpoint TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'method') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN method TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'status_code') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN status_code INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'request_body') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN request_body JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'response_body') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN response_body JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'error_message') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN error_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'duration_ms') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN duration_ms INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'ip_address') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN ip_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'user_agent') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN user_agent TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_call_logs' AND column_name = 'created_at') THEN
            ALTER TABLE public.api_call_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- CAMPAIGNS TABLE - Ensure all columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'name') THEN
            ALTER TABLE public.campaigns ADD COLUMN name TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'description') THEN
            ALTER TABLE public.campaigns ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'color') THEN
            ALTER TABLE public.campaigns ADD COLUMN color TEXT DEFAULT '#3B82F6';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'start_date') THEN
            ALTER TABLE public.campaigns ADD COLUMN start_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'end_date') THEN
            ALTER TABLE public.campaigns ADD COLUMN end_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'goal') THEN
            ALTER TABLE public.campaigns ADD COLUMN goal TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'budget') THEN
            ALTER TABLE public.campaigns ADD COLUMN budget DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'status') THEN
            ALTER TABLE public.campaigns ADD COLUMN status TEXT DEFAULT 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'created_at') THEN
            ALTER TABLE public.campaigns ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'updated_at') THEN
            ALTER TABLE public.campaigns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

-- Workspace Members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- Social Accounts
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace_id ON public.social_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_is_active ON public.social_accounts(is_active);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON public.posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_social_account_id ON public.posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON public.posts(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_campaign_id ON public.posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_posts_platforms ON public.posts USING GIN(platforms);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);

-- Post Analytics
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_platform ON public.post_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_fetched_at ON public.post_analytics(fetched_at DESC);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_platform ON public.comments(platform);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- AI Generations
CREATE INDEX IF NOT EXISTS idx_ai_generations_workspace_id ON public.ai_generations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_by ON public.ai_generations(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_generations_platform ON public.ai_generations(platform);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON public.ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_post_id ON public.ai_generations(post_id);

-- Strategy Recommendations
CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_workspace_id ON public.strategy_recommendations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_type ON public.strategy_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_status ON public.strategy_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_strategy_recommendations_priority ON public.strategy_recommendations(priority);

-- API Call Logs
CREATE INDEX IF NOT EXISTS idx_api_call_logs_workspace_id ON public.api_call_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON public.api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON public.api_call_logs(created_at DESC);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON public.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Drop all existing policies first (for clean re-creation)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ';';
    END LOOP;
END $$;

-- Enable RLS on all tables
DO $$ BEGIN ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.strategy_recommendations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- PROFILES: Users can view and update their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- WORKSPACES: Users can view workspaces they are members of
CREATE POLICY "Users can view own workspaces" 
    ON public.workspaces FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces" 
    ON public.workspaces FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces" 
    ON public.workspaces FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" 
    ON public.workspaces FOR DELETE 
    USING (owner_id = auth.uid());

-- WORKSPACE_MEMBERS: Members can view other members in their workspaces
CREATE POLICY "Members can view workspace members" 
    ON public.workspace_members FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can manage members" 
    ON public.workspace_members FOR ALL 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- SOCIAL_ACCOUNTS: Members can view accounts in their workspaces
CREATE POLICY "Members can view social accounts" 
    ON public.social_accounts FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Editors can manage social accounts" 
    ON public.social_accounts FOR ALL 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- POSTS: Members can view posts in their workspaces
CREATE POLICY "Members can view posts" 
    ON public.posts FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Editors can create posts" 
    ON public.posts FOR INSERT 
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Editors can update posts" 
    ON public.posts FOR UPDATE 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Editors can delete posts" 
    ON public.posts FOR DELETE 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- POST_ANALYTICS: Members can view analytics
CREATE POLICY "Members can view post analytics" 
    ON public.post_analytics FOR SELECT 
    USING (
        post_id IN (
            SELECT id FROM public.posts 
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- COMMENTS: Members can view comments
CREATE POLICY "Members can view comments" 
    ON public.comments FOR SELECT 
    USING (
        post_id IN (
            SELECT id FROM public.posts 
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- AI_GENERATIONS: Members can view generations in their workspaces
CREATE POLICY "Members can view ai generations" 
    ON public.ai_generations FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create ai generations" 
    ON public.ai_generations FOR INSERT 
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- STRATEGY_RECOMMENDATIONS: Members can view recommendations
CREATE POLICY "Members can view strategy recommendations" 
    ON public.strategy_recommendations FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- API_CALL_LOGS: Members can view logs in their workspaces
CREATE POLICY "Members can view api logs" 
    ON public.api_call_logs FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- CAMPAIGNS: Members can view campaigns in their workspaces
CREATE POLICY "Members can view campaigns" 
    ON public.campaigns FOR SELECT 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Editors can manage campaigns" 
    ON public.campaigns FOR ALL 
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- ============================================================================
-- FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Drop all existing triggers first (for clean re-creation)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON public.social_accounts;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_post_analytics_updated_at ON public.post_analytics;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
DROP TRIGGER IF EXISTS update_strategy_recommendations_updated_at ON public.strategy_recommendations;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_analytics_updated_at BEFORE UPDATE ON public.post_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_recommendations_updated_at BEFORE UPDATE ON public.strategy_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default workspace on profile creation
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
        NEW.name || '''s Workspace',
        'workspace-' || NEW.id,
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION create_default_workspace();

-- Function to add owner as workspace member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for key tables (safely handle if already added)
DO $$ 
BEGIN
    -- Try to drop tables from publication, ignore errors if not present
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.posts;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.post_analytics;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.comments;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.social_accounts;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.strategy_recommendations;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Now add them fresh
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_analytics;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.social_accounts;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.strategy_recommendations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant all on tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on tables to anon (for public data)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profile information extending auth.users';
COMMENT ON TABLE public.workspaces IS 'Team/organization workspaces for content management';
COMMENT ON TABLE public.workspace_members IS 'Workspace membership and RBAC';
COMMENT ON TABLE public.social_accounts IS 'Connected social media platform accounts';
COMMENT ON TABLE public.posts IS 'Content posts across all platforms';
COMMENT ON TABLE public.post_analytics IS 'Engagement metrics and analytics for posts';
COMMENT ON TABLE public.comments IS 'Comments on posts from social platforms';
COMMENT ON TABLE public.ai_generations IS 'AI-generated content history';
COMMENT ON TABLE public.strategy_recommendations IS 'AI-powered strategy and growth recommendations';
COMMENT ON TABLE public.api_call_logs IS 'API request/response logs for debugging';
COMMENT ON TABLE public.campaigns IS 'Marketing campaigns for organizing posts';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

