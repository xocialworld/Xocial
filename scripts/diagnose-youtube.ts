import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log(`Loading .env.local from ${envLocalPath}`);
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log(`Loading .env from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env or .env.local file found!');
}

console.log('\n--- YouTube Integration Diagnostics ---\n');

const checks = [
  { key: 'YOUTUBE_CLIENT_ID', required: true },
  { key: 'YOUTUBE_CLIENT_SECRET', required: true },
  { key: 'NEXT_PUBLIC_APP_URL', required: true },
  { key: 'ENCRYPTION_KEY', required: true, validate: (val: string) => val.length === 64 || 'Must be 64 chars (32 bytes hex)' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
];

let hasErrors = false;

checks.forEach(({ key, required, validate }) => {
  const value = process.env[key];
  if (!value) {
    if (required) {
      console.error(`❌ Missing required environment variable: ${key}`);
      hasErrors = true;
    } else {
      console.warn(`⚠️  Missing optional environment variable: ${key}`);
    }
  } else {
    if (validate) {
      const validationResult = validate(value);
      if (validationResult !== true) {
        console.error(`❌ Invalid ${key}: ${validationResult}`);
        hasErrors = true;
      } else {
        console.log(`✅ ${key} is set and valid`);
      }
    } else {
      console.log(`✅ ${key} is set`);
    }
  }
});

console.log('\n--- Configuration Analysis ---\n');

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const redirectUri = `${appUrl}/api/auth/youtube/callback`;

console.log(`App URL: ${appUrl}`);
console.log(`Expected Redirect URI: ${redirectUri}`);
console.log('\nIMPORTANT: Ensure this Redirect URI is added to your Google Cloud Console credentials.');

if (hasErrors) {
  console.error('\n❌ Diagnostics failed. Please fix the missing or invalid environment variables.');
  process.exit(1);
} else {
  console.log('\n✅ Diagnostics passed. Environment variables appear correct.');
}
