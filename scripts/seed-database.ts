import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type DemoEntities = {
  userId: string;
  workspaceId: string;
  socialAccountId: string;
};

async function main() {
  try {
    const envPath = join(__dirname, '../.env.local');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch {}

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.');
  }

  const supabase = createClient<any>(url, serviceRoleKey);

  const demo: DemoEntities = {
    userId: '00000000-0000-4000-8000-000000000001',
    workspaceId: '11111111-0000-4000-8000-000000000001',
    socialAccountId: '22222222-0000-4000-8000-000000000001',
  };

  const demoEmail = 'founder@xocial.demo';
  const demoPassword = 'XocialDemo!2025';

  console.log('🌱 Seeding demo user...');
  await ensureDemoUser(supabase, demo, demoEmail, demoPassword);

  console.log('🏢 Seeding demo workspace + membership...');
  await ensureDemoWorkspace(supabase, demo);

  console.log('🔌 Seeding social account placeholder...');
  await ensureDemoSocialAccount(supabase, demo);

  console.log('📝 Seeding sample post...');
  await ensureDemoPost(supabase, demo);

  console.log('✅ Seeding default approval workflow...');
  const workflow = await ensureDefaultApprovalWorkflow(supabase, demo);

  console.log('🧾 Seeding approval instance for demo post...');
  await ensureApprovalInstanceForDemoPost(supabase, demo, workflow.id);

  console.log('✅ Demo data ready!');
}

async function ensureDemoUser(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities,
  email: string,
  password: string
) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Demo Founder' },
      id: ids.userId,
    });
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: ids.userId,
        email,
        name: 'Demo Founder',
        timezone: 'UTC',
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw error;
  }
}

async function ensureDemoWorkspace(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities
) {
  const { error: workspaceError } = await supabase
    .from('workspaces')
    .upsert(
      {
        id: ids.workspaceId,
        name: 'Demo Agency Workspace',
        slug: 'demo-agency',
        owner_id: ids.userId,
        settings: { plan: 'pro' },
      },
      { onConflict: 'id' }
    );

  if (workspaceError) {
    throw workspaceError;
  }

  const { error: membershipError } = await supabase
    .from('workspace_members')
    .upsert(
      {
        workspace_id: ids.workspaceId,
        user_id: ids.userId,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' }
    );

  if (membershipError) {
    throw membershipError;
  }
}

async function ensureDemoSocialAccount(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities
) {
  const { error } = await supabase
    .from('social_accounts')
    .upsert(
      {
        id: ids.socialAccountId,
        workspace_id: ids.workspaceId,
        platform: 'instagram',
        account_id: 'demo-instagram-001',
        account_name: 'Demo Instagram',
        account_handle: '@demoagency',
        follower_count: 12000,
        access_token: 'encrypted-placeholder',
        is_active: true,
        metadata: {
          demo: true,
          description: 'Sample Instagram business account for demos',
        },
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw error;
  }
}

async function ensureDemoPost(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities
) {
  const { error } = await supabase
    .from('posts')
    .upsert(
      {
        id: '33333333-0000-4000-8000-000000000001',
        workspace_id: ids.workspaceId,
        social_account_id: ids.socialAccountId,
        content: {
          text: '🎉 Welcome to Xocial! This is a seeded post so designers have data to look at.',
          media_urls: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'],
        },
        platforms: ['instagram'],
        status: 'pending_approval',
        scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        metadata: { demo: true },
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw error;
  }
}

async function ensureDefaultApprovalWorkflow(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities
) {
  const { data: existing } = await supabase
    .from('approval_workflows')
    .select('id')
    .eq('workspace_id', ids.workspaceId)
    .eq('is_default', true)
    .maybeSingle();

  if (existing) {
    return { id: existing.id };
  }

  const { data: workflow, error: workflowError } = await supabase
    .from('approval_workflows')
    .insert({
      workspace_id: ids.workspaceId,
      name: 'Default: Manager Approval',
      description: 'Single-step manager approval for publishing',
      type: 'single_step',
      is_default: true,
    })
    .select()
    .single();

  if (workflowError) throw workflowError;

  const { error: stepError } = await supabase
    .from('approval_workflow_steps')
    .insert({
      workflow_id: workflow.id,
      step_order: 1,
      required_role: 'manager',
      approval_rule: 'any',
    });

  if (stepError) throw stepError;

  return { id: workflow.id };
}

async function ensureApprovalInstanceForDemoPost(
  supabase: SupabaseClient<any, any, any>,
  ids: DemoEntities,
  workflowId: string
) {
  // Fetch first step
  const { data: firstStep, error: stepError } = await supabase
    .from('approval_workflow_steps')
    .select('id')
    .eq('workflow_id', workflowId)
    .order('step_order', { ascending: true })
    .limit(1)
    .single();

  if (stepError || !firstStep) throw stepError || new Error('No workflow steps');

  // Check if instance exists
  const { data: existing } = await supabase
    .from('content_approval_instances')
    .select('id')
    .eq('content_item_id', '33333333-0000-4000-8000-000000000001')
    .maybeSingle();

  if (existing) return;

  const { error: instanceError } = await supabase
    .from('content_approval_instances')
    .insert({
      content_item_id: '33333333-0000-4000-8000-000000000001',
      workflow_id: workflowId,
      current_step_id: firstStep.id,
      status: 'pending',
    });

  if (instanceError) throw instanceError;
}

main().catch((error) => {
  console.error('❌ Failed to seed demo data:', error);
  process.exit(1);
});
