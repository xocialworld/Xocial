#!/usr/bin/env tsx
/**
 * Apply Supabase Migration Script
 * 
 * This script applies migrations sequentially to the Supabase database using the 'pg' library.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

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
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!url) {
    throw new Error(
      'Please set NEXT_PUBLIC_SUPABASE_URL before running migrations.'
    );
  }

  if (!dbPassword) {
    throw new Error(
      'Please set SUPABASE_DB_PASSWORD in .env.local before running migrations.'
    );
  }

  // Extract project ref from URL
  const projectMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectRef = projectMatch[1];

  // Construct database connection string
  // Using Supabase connection pooler
  // Try plain 'postgres' user
  const dbHost = 'aws-0-us-east-1.pooler.supabase.com';
  const connectionString = `postgresql://postgres:${dbPassword}@${dbHost}:6543/postgres`;

  console.log(`🚀 Starting migration process for project ${projectRef}...`);
  console.log(`🔌 Connecting to ${dbHost}...`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Supabase requires SSL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!');

    // List of migrations to apply
    const migrations = [
      '20251203_fix_oauth_state.sql',
      '20251203_create_srs_content_tables.sql',
      '20251203_make_media_public.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(
        __dirname,
        '../supabase/migrations',
        migrationFile
      );

      console.log(`\n📄 Applying ${migrationFile}...`);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      try {
        await client.query(migrationSQL);
        console.log(`✅ ${migrationFile} applied successfully!`);
      } catch (err: any) {
        console.error(`❌ Failed to apply ${migrationFile}:`);
        console.error(err.message);
        // Optional: decide whether to stop or continue. 
        // For now, we stop to avoid cascading errors.
        process.exit(1);
      }
    }

    console.log('\n✨ All migrations completed successfully!');

  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
