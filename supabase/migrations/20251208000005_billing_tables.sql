-- Billing Tables for Razorpay Integration
-- Phase 1: Core billing infrastructure

-- 1. Subscriptions table - tracks workspace subscription status
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'growth', 'enterprise')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')) DEFAULT 'active',
  
  -- Razorpay specific fields
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  razorpay_plan_id TEXT,
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One subscription per workspace
  UNIQUE(workspace_id)
);

-- 2. Billing history - transaction records
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Razorpay payment details
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  
  -- Amount and currency
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Description and invoice
  description TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Plan limits configuration (for soft/hard enforcement)
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL UNIQUE CHECK (plan IN ('free', 'pro', 'growth', 'enterprise')),
  
  -- Limits
  max_users INTEGER NOT NULL DEFAULT 1,
  max_workspaces INTEGER NOT NULL DEFAULT 1,
  max_social_profiles INTEGER NOT NULL DEFAULT 3,
  max_scheduled_posts INTEGER DEFAULT NULL, -- NULL = unlimited
  
  -- Features
  ai_enabled BOOLEAN DEFAULT FALSE,
  advanced_analytics BOOLEAN DEFAULT FALSE,
  approval_workflows BOOLEAN DEFAULT FALSE,
  engagement_inbox BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  
  -- Pricing (in cents, INR)
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  extra_seat_price_cents INTEGER DEFAULT 0,
  extra_workspace_price_cents INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert default plan limits
INSERT INTO plan_limits (plan, max_users, max_workspaces, max_social_profiles, ai_enabled, advanced_analytics, approval_workflows, engagement_inbox, price_monthly_cents, price_yearly_cents, extra_seat_price_cents)
VALUES 
  ('free', 1, 1, 3, FALSE, FALSE, FALSE, FALSE, 0, 0, 0),
  ('pro', 3, 1, 10, TRUE, FALSE, TRUE, FALSE, 324900, 3249000, 83000),  -- ₹3,249/mo, ₹830/seat
  ('growth', 10, 3, 30, TRUE, TRUE, TRUE, TRUE, 824900, 8249000, 83000),  -- ₹8,249/mo
  ('enterprise', 999, 999, 999, TRUE, TRUE, TRUE, TRUE, 0, 0, 0)  -- Custom pricing
ON CONFLICT (plan) DO NOTHING;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Subscription viewable by workspace members"
ON subscriptions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Subscription manageable by workspace owners"
ON subscriptions FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- RLS Policies for billing_history
CREATE POLICY "Billing history viewable by workspace owners"
ON billing_history FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Plan limits are public read
CREATE POLICY "Plan limits are public"
ON plan_limits FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay ON subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_workspace ON billing_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment ON billing_history(razorpay_payment_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscriptions updated_at
DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Create default free subscription for existing workspaces
INSERT INTO subscriptions (workspace_id, plan, status)
SELECT id, 'free', 'active'
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM subscriptions)
ON CONFLICT (workspace_id) DO NOTHING;
