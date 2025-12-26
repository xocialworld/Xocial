-- Create analytics_web_vitals table
CREATE TABLE IF NOT EXISTS public.analytics_web_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    rating TEXT,
    delta NUMERIC,
    metric_id TEXT,
    navigation_type TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'cta_click', 'feature_interaction', etc.
    label TEXT,
    url TEXT,
    user_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES public.workspaces(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_ai_metrics table
CREATE TABLE IF NOT EXISTS public.analytics_ai_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'ai_generate', etc.
    duration NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    url TEXT,
    user_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES public.workspaces(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analytics_web_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_ai_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (modify as needed for your access control)
-- Allow public insert for web vitals (often anonymous)
CREATE POLICY "Allow public insert for web vitals" ON public.analytics_web_vitals
    FOR INSERT TO public, anon, authenticated
    WITH CHECK (true);

-- Allow authenticated insert for events and AI metrics
CREATE POLICY "Allow authenticated insert for events" ON public.analytics_events
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated insert for ai metrics" ON public.analytics_ai_metrics
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow workspace owners/admins to view analytics (this is a simplified policy example)
-- In a real app, you'd likely join with workspace_members
CREATE POLICY "Allow workspace members to select events" ON public.analytics_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = analytics_events.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow workspace members to select ai metrics" ON public.analytics_ai_metrics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = analytics_ai_metrics.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );
