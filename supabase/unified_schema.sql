-- ============================================================================
-- XOCIAL UNIFIED DATABASE SCHEMA
-- ============================================================================
-- Combines all essential migrations into a single, idempotent SQL file
-- Safe to run multiple times - will only create missing tables/columns
-- ============================================================================
--
-- HOW TO USE:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" - Can be run multiple times safely
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. PROFILES
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

-- 2. WORKSPACES
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

-- 3. WORKSPACE_MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'client')),
    permissions JSONB DEFAULT '[]'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 4. SOCIAL_ACCOUNTS
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

-- 5. POSTS
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
-- CRITICAL: Add post_type column to posts
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'post_type'
    ) THEN
        ALTER TABLE public.posts 
        ADD COLUMN post_type TEXT 
        CHECK (post_type IN ('feed', 'story', 'reel', 'video', 'carousel', 'tweet', 'article', 'short'));
        RAISE NOTICE '✓ Added post_type column to posts table';
    END IF;
END $$;

-- ============================================================================
-- PLATFORM PUBLISHING TABLES (Critical for View Posts feature)
-- ============================================================================

-- 6. PLATFORM_POSTS - Stores platform-specific post IDs
CREATE TABLE IF NOT EXISTS public.platform_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_post_id TEXT NOT NULL,
    permalink TEXT,
    published_at TIMESTAMPTZ,
    status TEXT DEFAULT 'published',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ENGAGEMENT_HISTORY - Time-series engagement data
CREATE TABLE IF NOT EXISTS public.engagement_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_post_id UUID NOT NULL REFERENCES public.platform_posts(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SUPPORTING TABLES
-- ============================================================================

-- 8. CAMPAIGNS (for post organization)
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

-- 9. MEDIA
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI_GENERATIONS
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    platform TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Social Accounts
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace_id ON public.social_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON public.posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_social_account_id ON public.posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- Platform Posts (CRITICAL for View Posts performance)
CREATE INDEX IF NOT EXISTS idx_platform_posts_post_id ON public.platform_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform ON public.platform_posts(platform);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform_post_id ON public.platform_posts(platform_post_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_published_at ON public.platform_posts(published_at DESC);

-- Engagement History
CREATE INDEX IF NOT EXISTS idx_engagement_history_platform_post ON public.engagement_history(platform_post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_history_recorded ON public.engagement_history(recorded_at DESC);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON public.campaigns(workspace_id);

-- Media
CREATE INDEX IF NOT EXISTS idx_media_workspace_id ON public.media(workspace_id);

-- AI Generations
CREATE INDEX IF NOT EXISTS idx_ai_generations_workspace_id ON public.ai_generations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_by ON public.ai_generations(created_by);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
DO $$ BEGIN ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.platform_posts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.engagement_history ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.media ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Drop existing policies (for clean recreation)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can insert social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can update social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can delete social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view platform posts" ON public.platform_posts;
DROP POLICY IF EXISTS "Users can manage platform posts" ON public.platform_posts;
DROP POLICY IF EXISTS "Users can view engagement history" ON public.engagement_history;
DROP POLICY IF EXISTS "Users can view campaigns" ON public.campaigns;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- WORKSPACES POLICIES
CREATE POLICY "Users can view own workspaces" 
    ON public.workspaces FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- WORKSPACE MEMBERS POLICIES
CREATE POLICY "Users can view workspace members" 
    ON public.workspace_members FOR SELECT 
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        ) OR 
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- SOCIAL ACCOUNTS POLICIES (FIXED for workspace owners)
CREATE POLICY "Users can view social accounts" 
    ON public.social_accounts FOR SELECT 
    USING (
        -- Owner check OR member check
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = social_accounts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = social_accounts.workspace_id 
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert social accounts" 
    ON public.social_accounts FOR INSERT 
    WITH CHECK (
        -- Owner check OR member with correct role
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = social_accounts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = social_accounts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can update social accounts" 
    ON public.social_accounts FOR UPDATE 
    USING (
        -- Owner check OR member with correct role
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = social_accounts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = social_accounts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can delete social accounts" 
    ON public.social_accounts FOR DELETE 
    USING (
        -- Owner check OR admin member
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = social_accounts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = social_accounts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- POSTS POLICIES
CREATE POLICY "Users can view posts" 
    ON public.posts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = posts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = posts.workspace_id 
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert posts" 
    ON public.posts FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = posts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = posts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can update posts" 
    ON public.posts FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = posts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = posts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can delete posts" 
    ON public.posts FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = posts.workspace_id 
            AND workspaces.owner_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = posts.workspace_id 
            AND workspace_members.user_id = auth.uid() 
            AND workspace_members.role IN ('owner', 'admin', 'editor')
        )
    );

-- PLATFORM POSTS POLICIES (CRITICAL for View Posts)
CREATE POLICY "Users can view platform posts"
    ON public.platform_posts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = platform_posts.post_id
            AND (
                p.workspace_id IN (
                    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
                ) OR 
                p.workspace_id IN (
                    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can manage platform posts"
    ON public.platform_posts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = platform_posts.post_id
            AND (
                p.workspace_id IN (
                    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
                ) OR 
                p.workspace_id IN (
                    SELECT workspace_id FROM public.workspace_members 
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                )
            )
        )
    );

-- ENGAGEMENT HISTORY POLICIES
CREATE POLICY "Users can view engagement history"
    ON public.engagement_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_posts pp
            JOIN public.posts p ON p.id = pp.post_id
            WHERE pp.id = engagement_history.platform_post_id
            AND (
                p.workspace_id IN (
                    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
                ) OR 
                p.workspace_id IN (
                    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
                )
            )
        )
    );

-- CAMPAIGNS POLICIES
CREATE POLICY "Users can view campaigns" 
    ON public.campaigns FOR SELECT 
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        ) OR 
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON public.social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_posts_updated_at ON public.platform_posts;
CREATE TRIGGER update_platform_posts_updated_at
    BEFORE UPDATE ON public.platform_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Xocial Database Schema Applied';
    RAISE NOTICE '✓ All tables created successfully';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '✓ RLS policies enabled';
    RAISE NOTICE '✓ Triggers configured';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Ready for View Posts & Sync Features';
    RAISE NOTICE '========================================';
END $$;
