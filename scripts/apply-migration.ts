#!/usr/bin/env tsx
/**
 * Apply Supabase Migration Script
 * 
 * This script applies the oauth_state migration directly to the Supabase database
 * using the Supabase CLI with remote connection, or falls back to direct SQL execution.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Load environment variables from .env.local if it exists
try {
  if (existsSync(join(__dirname, '../.env.local'))) {
    const envContent = readFileSync(join(__dirname, '../.env.local'), 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // Ignore errors loading .env.local
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!url) {
    throw new Error(
      'Please set NEXT_PUBLIC_SUPABASE_URL before running migrations.'
    );
  }

  // Extract project ref from URL (e.g., https://fwfjqvzmrrswkkksjunm.supabase.co)
  const projectMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectRef = projectMatch[1];

  // Read the migration file
  const migrationPath = join(
    __dirname,
    '../supabase/migrations/20251113000000_add_profiles_oauth_state.sql'
  );

  console.log('📄 Reading migration file...');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration: Add oauth_state column to profiles...');

  try {
    // Method 1: Try using Supabase CLI with remote connection
    if (dbPassword) {
      console.log('📡 Attempting to apply migration via Supabase CLI...');
      try {
        // Construct database URL
        const dbUrl = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
        
        // Use Supabase CLI to execute the migration
        execSync(
          `supabase db execute --db-url "${dbUrl}" --file "${migrationPath}"`,
          { stdio: 'inherit', encoding: 'utf-8' }
        );
        console.log('✅ Migration applied successfully via Supabase CLI!');
        return;
      } catch (error: any) {
        console.log('⚠️  Supabase CLI method failed, trying alternative...');
      }
    }

    // Method 2: Try using psql directly if available
    if (dbPassword) {
      console.log('📡 Attempting to apply migration via psql...');
      try {
        const dbHost = `db.${projectRef}.supabase.co`;
        const dbUrl = `postgresql://postgres:${dbPassword}@${dbHost}:5432/postgres`;
        
        execSync(
          `psql "${dbUrl}" -c "${migrationSQL.replace(/"/g, '\\"')}"`,
          { stdio: 'inherit', encoding: 'utf-8' }
        );
        console.log('✅ Migration applied successfully via psql!');
        return;
      } catch (error: any) {
        console.log('⚠️  psql method failed, trying Supabase REST API...');
      }
    }

    // Method 3: Use Supabase REST API with a workaround
    // Since we can't execute raw SQL via REST API, we'll check if column exists
    // and provide instructions if it doesn't
    if (serviceRoleKey) {
      console.log('📡 Checking column status via Supabase API...');
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabase = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { error: testError } = await supabase
        .from('profiles')
        .select('oauth_state')
        .limit(1);

      if (testError) {
        if (
          testError.message?.includes('column') &&
          testError.message?.includes('does not exist')
        ) {
          console.log('\n⚠️  Column oauth_state does not exist.');
          console.log('\n📝 To apply this migration, please run one of the following:');
          console.log('\n1. Via Supabase Dashboard:');
          console.log('   - Go to https://app.supabase.com/project/' + projectRef + '/sql/new');
          console.log('   - Copy and paste the SQL from: ' + migrationPath);
          console.log('   - Click "Run"');
          console.log('\n2. Via Supabase CLI (if linked):');
          console.log('   supabase db push');
          console.log('\n3. Via psql (if you have the database password):');
          console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f "${migrationPath}"`);
          console.log('\nThe migration SQL is safe to run multiple times (uses IF NOT EXISTS).');
          process.exit(1);
        } else {
          throw new Error(`Unexpected error: ${testError.message}`);
        }
      } else {
        console.log('✅ Column oauth_state already exists. Migration not needed.');
        return;
      }
    }

    throw new Error(
      'Unable to apply migration. Please set SUPABASE_DB_PASSWORD or use Supabase Dashboard.'
    );
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

