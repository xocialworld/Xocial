#!/usr/bin/env node

/**
 * Environment Variables Checker
 *
 * This script checks if all required environment variables are set up correctly
 * before running the application.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const { reset, red, green, yellow, blue, cyan, bold } = colors;

// Detect if running in production
const isProduction =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

// Required environment variables
const REQUIRED_VARS = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL',
    example: 'https://xxxxxxxxxxxxx.supabase.co',
    getFrom: 'https://app.supabase.com/project/_/settings/api',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Your Supabase anonymous (public) key',
    example: 'eyJhbGc...',
    getFrom: 'https://app.supabase.com/project/_/settings/api',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (needed for cron jobs and server tasks)',
    example: 'eyJhbGc...',
    getFrom: 'https://app.supabase.com/project/_/settings/api',
  },
  {
    name: 'VERCEL_AI_GATEWAY_API_KEY',
    description: 'Your Vercel AI Gateway API key',
    example: 'sk-...',
    getFrom: 'https://vercel.com/dashboard/ai-gateway',
  },
  {
    name: 'ENCRYPTION_KEY',
    description: '64-hex key for AES-256-GCM token encryption',
    example: 'openssl rand -hex 32',
    getFrom: 'Generate locally with openssl',
  },
];

// Production-only required variables (optional in development)
const PRODUCTION_REQUIRED_VARS = [
  {
    name: 'CRON_SECRET',
    description: 'Secret for authenticating Vercel cron requests',
    example: 'openssl rand -hex 32',
    getFrom: 'Generate locally with openssl',
    devNote: 'Only required in production (Vercel cron jobs)',
  },
];

// Optional/recommended environment variables
const OPTIONAL_VARS = [
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Application URL (defaults to http://localhost:3000)',
    example: 'http://localhost:3000',
  },
  {
    name: 'XOCIAL_DEV_ADMIN_EMAILS',
    description: 'Comma-separated internal dev/admin users who receive plan override access',
    example: 's.etup.xocial@gmail.com',
  },
  {
    name: 'XOCIAL_DEV_ADMIN_USER_IDS',
    description: 'Comma-separated internal dev/admin Supabase user IDs who receive plan override access',
    example: 'e45bfad9-d919-4b82-a7b9-eeac8d02f705',
  },
  {
    name: 'XOCIAL_DEV_ADMIN_PLAN',
    description: 'Plan applied to configured dev/admin users for plan-gated checks',
    example: 'enterprise',
  },
  // OAuth credentials per platform
  { name: 'FACEBOOK_APP_ID', description: 'Meta App ID', example: '123456789012345' },
  { name: 'FACEBOOK_APP_SECRET', description: 'Meta App Secret', example: 'a1b2c3...' },
  {
    name: 'FACEBOOK_LOGIN_CONFIG_ID',
    description: 'Facebook Page Login for Business Config ID',
    example: '123456789012345',
  },
  {
    name: 'INSTAGRAM_FACEBOOK_LOGIN_CONFIG_ID',
    description: 'Instagram via Facebook Page Login Config ID',
    example: '123456789012345',
  },
  {
    name: 'INSTAGRAM_LOGIN_CONFIG_ID',
    description: 'Legacy fallback for Instagram via Facebook Page Login Config ID',
    example: '123456789012345',
  },
  {
    name: 'FACEBOOK_WEBHOOK_VERIFY_TOKEN',
    description: 'Meta webhook token',
    example: 'random-hex',
  },
  {
    name: 'INSTAGRAM_CLIENT_ID',
    description: 'Instagram Login Client ID',
    example: '123456789012345',
  },
  {
    name: 'INSTAGRAM_CLIENT_SECRET',
    description: 'Instagram Login Client Secret',
    example: 'a1b2c3...',
  },
  {
    name: 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN',
    description: 'Instagram webhook token',
    example: 'random-hex',
  },
  { name: 'TWITTER_CLIENT_ID', description: 'Twitter Client ID', example: 'xxx' },
  { name: 'TWITTER_CLIENT_SECRET', description: 'Twitter Client Secret', example: 'xxx' },
  {
    name: 'TWITTER_API_MODE',
    description: 'Twitter/X API mode: no-spend for setup checks, live after adding X API credits',
    example: 'no-spend',
  },
  { name: 'LINKEDIN_CLIENT_ID', description: 'LinkedIn Client ID', example: 'xxx' },
  { name: 'LINKEDIN_CLIENT_SECRET', description: 'LinkedIn Client Secret', example: 'xxx' },
  {
    name: 'LINKEDIN_API_VERSION',
    description: 'LinkedIn Marketing API version header for /rest APIs',
    example: '202605',
  },
  {
    name: 'LINKEDIN_ENABLE_ORGANIZATION_ACCESS',
    description: 'Set true only after LinkedIn approves organization/community-management scopes',
    example: 'false',
  },
  {
    name: 'LINKEDIN_ENABLE_MEMBER_ANALYTICS',
    description: 'Set true only after LinkedIn approves member read/analytics scopes',
    example: 'false',
  },
  {
    name: 'LINKEDIN_EXTRA_SCOPES',
    description: 'Optional space/comma-separated LinkedIn scopes for approved products',
    example: 'r_member_postAnalytics',
  },
  { name: 'YOUTUBE_CLIENT_ID', description: 'YouTube Client ID', example: 'xxx' },
  { name: 'YOUTUBE_CLIENT_SECRET', description: 'YouTube Client Secret', example: 'xxx' },
  { name: 'TIKTOK_CLIENT_KEY', description: 'TikTok Client Key', example: 'xxx' },
  { name: 'TIKTOK_CLIENT_SECRET', description: 'TikTok Client Secret', example: 'xxx' },
];

function printHeader() {
  console.log(
    `\n${cyan}${bold}═══════════════════════════════════════════════════════════${reset}`
  );
  console.log(`${cyan}${bold}   XOCIAL - Environment Variables Checker${reset}`);
  console.log(
    `${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`
  );
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.log(`${red}${bold}✗ ERROR: .env.local file not found!${reset}\n`);
    console.log(`${yellow}The application requires a .env.local file to run.${reset}\n`);
    console.log(`${bold}Quick Fix:${reset}`);
    console.log(`  1. Create a .env.local file in the project root`);
    console.log(`  2. Add your environment variables (see template below)\n`);
    console.log(`${bold}📚 For detailed setup instructions:${reset}`);
    console.log(`  ${cyan}Read: ./ENV_SETUP.md${reset}\n`);

    printEnvTemplate();
    return false;
  }

  console.log(`${green}✓ .env.local file found${reset}\n`);
  return true;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

function checkRequiredVars(envVars) {
  console.log(`${bold}Checking Required Variables:${reset}\n`);

  let allPresent = true;
  const missing = [];
  const invalid = [];

  REQUIRED_VARS.forEach(({ name, description, example, getFrom }) => {
    const value = envVars[name];
    const isPresent =
      value && value.length > 0 && !value.includes('your_') && !value.includes('your-');

    if (isPresent) {
      // Extra validations for certain vars
      const validationError = validateVar(name, value);
      if (validationError) {
        allPresent = false;
        invalid.push({ name, description, example, getFrom, error: validationError });
        console.log(`  ${red}✗${reset} ${name} ${red}(${validationError})${reset}`);
      } else {
        const maskedValue = maskValue(value, name);
        console.log(`  ${green}✓${reset} ${name}`);
        console.log(`    ${cyan}→ ${maskedValue}${reset}`);
      }
    } else {
      allPresent = false;
      missing.push({ name, description, example, getFrom });
      console.log(`  ${red}✗${reset} ${name} ${red}(missing or invalid)${reset}`);
    }
  });

  console.log();

  if (!allPresent) {
    console.log(`${red}${bold}Missing or Invalid Required Variables:${reset}\n`);
    missing.forEach(({ name, description, example, getFrom }) => {
      console.log(`${yellow}${bold}${name}${reset}`);
      console.log(`  ${description}`);
      console.log(`  Example: ${cyan}${example}${reset}`);
      console.log(`  Get from: ${blue}${getFrom}${reset}\n`);
    });
    invalid.forEach(({ name, description, example, getFrom, error }) => {
      console.log(`${yellow}${bold}${name}${reset}`);
      console.log(`  ${description}`);
      console.log(`  ${red}Invalid format:${reset} ${error}`);
      console.log(`  Example: ${cyan}${example}${reset}`);
      if (getFrom) console.log(`  Get from: ${blue}${getFrom}${reset}\n`);
      else console.log();
    });
  }

  return allPresent;
}

function checkProductionRequiredVars(envVars) {
  if (PRODUCTION_REQUIRED_VARS.length === 0) return true;

  console.log(`${bold}Checking Production-Only Variables:${reset}`);
  console.log(`${yellow}(Required in production, optional in development)${reset}\n`);

  let allPresent = true;
  const warnings = [];

  PRODUCTION_REQUIRED_VARS.forEach(({ name, description, example, getFrom, devNote }) => {
    const value = envVars[name];
    const isPresent =
      value && value.length > 0 && !value.includes('your_') && !value.includes('your-');

    if (isPresent) {
      const validationError = validateVar(name, value);
      if (validationError) {
        if (isProduction) {
          allPresent = false;
          console.log(`  ${red}✗${reset} ${name} ${red}(${validationError})${reset}`);
        } else {
          console.log(`  ${yellow}⚠${reset} ${name} ${yellow}(${validationError})${reset}`);
          warnings.push({ name, description, example, getFrom, devNote, error: validationError });
        }
      } else {
        const maskedValue = maskValue(value, name);
        console.log(`  ${green}✓${reset} ${name}`);
        console.log(`    ${cyan}→ ${maskedValue}${reset}`);
      }
    } else {
      if (isProduction) {
        allPresent = false;
        console.log(`  ${red}✗${reset} ${name} ${red}(missing)${reset}`);
      } else {
        console.log(`  ${yellow}○${reset} ${name} ${yellow}(not set - ${devNote})${reset}`);
        warnings.push({ name, description, example, getFrom, devNote });
      }
    }
  });

  console.log();

  if (warnings.length > 0 && !isProduction) {
    console.log(`${yellow}${bold}Development Mode Warnings:${reset}\n`);
    warnings.forEach(({ name, description, devNote, error }) => {
      console.log(`${yellow}${bold}${name}${reset}`);
      console.log(`  ${description}`);
      console.log(`  ${cyan}Note:${reset} ${devNote}`);
      if (error) console.log(`  ${yellow}Current value:${reset} ${error}`);
      console.log();
    });
  } else if (!allPresent && isProduction) {
    console.log(`${red}${bold}Missing Production Variables:${reset}\n`);
    PRODUCTION_REQUIRED_VARS.forEach(({ name, description, example, getFrom }) => {
      const value = envVars[name];
      const isPresent = value && value.length > 0;
      if (!isPresent) {
        console.log(`${yellow}${bold}${name}${reset}`);
        console.log(`  ${description}`);
        console.log(`  Example: ${cyan}${example}${reset}`);
        console.log(`  Get from: ${blue}${getFrom}${reset}\n`);
      }
    });
  }

  // In development, return true even if warnings exist
  return isProduction ? allPresent : true;
}

function checkOptionalVars(envVars) {
  console.log(`${bold}Checking Optional Variables:${reset}\n`);

  OPTIONAL_VARS.forEach(({ name, description, example }) => {
    const value = envVars[name];
    const isPresent = value && value.length > 0;

    if (isPresent) {
      const maskedValue = maskValue(value, name);
      console.log(`  ${green}✓${reset} ${name}`);
      console.log(`    ${cyan}→ ${maskedValue}${reset}`);
    } else {
      console.log(`  ${yellow}○${reset} ${name} ${yellow}(optional, not set)${reset}`);
      console.log(`    ${description}`);
    }
  });

  console.log();
}

function maskValue(value, name) {
  // Don't mask URLs
  if (name.includes('URL')) {
    return value;
  }

  // Mask API keys - show first 8 and last 4 characters
  if (value.length > 20) {
    const start = value.substring(0, 8);
    const end = value.substring(value.length - 4);
    return `${start}${'*'.repeat(12)}${end}`;
  }

  // For shorter values, show first 4 characters
  const start = value.substring(0, 4);
  return `${start}${'*'.repeat(8)}`;
}

function printEnvTemplate() {
  console.log(`${bold}Template for .env.local:${reset}\n`);
  console.log(`${cyan}# Supabase Configuration${reset}`);
  console.log(`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here\n`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here\n`);
  console.log(`${cyan}# Vercel AI Gateway Configuration${reset}`);
  console.log(`VERCEL_AI_GATEWAY_API_KEY=your_vercel_ai_gateway_api_key_here\n`);
  console.log(`${cyan}# Security${reset}`);
  console.log(`ENCRYPTION_KEY=$(openssl rand -hex 32)`);
  console.log(`CRON_SECRET=$(openssl rand -hex 32)\n`);
  console.log(`${cyan}# Application Configuration${reset}`);
  console.log(`NEXT_PUBLIC_APP_URL=http://localhost:3000\n`);
}

function printSummary(allGood) {
  console.log(
    `${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`
  );

  if (allGood) {
    console.log(`${green}${bold}✓ All required environment variables are configured!${reset}\n`);
    if (!isProduction) {
      console.log(`${cyan}Running in: ${bold}Development Mode${reset}`);
      console.log(
        `${yellow}Note: Some production-only variables may show warnings above.${reset}\n`
      );
    }
    console.log(`${bold}Next steps:${reset}`);
    console.log(`  1. Run database migrations (see README.md)`);
    console.log(`  2. Start the development server: ${cyan}npm run dev${reset}\n`);
  } else {
    if (isProduction) {
      console.log(`${red}${bold}✗ Production environment setup is incomplete${reset}\n`);
    } else {
      console.log(`${red}${bold}✗ Environment setup is incomplete${reset}\n`);
    }
    console.log(`${bold}Please fix the issues above before running the application.${reset}\n`);
    console.log(`${bold}📚 Resources:${reset}`);
    console.log(`  • Variables reference: ${cyan}./ENV_VARIABLES_REFERENCE.md${reset}`);
    console.log(`  • Project readme: ${cyan}./README.md${reset}\n`);
  }
}

function validateVar(name, value) {
  switch (name) {
    case 'ENCRYPTION_KEY': {
      const hex64 = /^[a-f0-9]{64}$/i.test(value);
      return hex64 ? null : 'Must be 64 hex characters (openssl rand -hex 32)';
    }
    case 'CRON_SECRET': {
      const ok = /^[a-zA-Z0-9_\-]{16,}$/.test(value) || /^[a-f0-9]{32,}$/i.test(value);
      return ok ? null : 'Should be a reasonably long random string (>=16 chars)';
    }
    case 'NEXT_PUBLIC_SUPABASE_URL': {
      const ok = /^https:\/\/.+\.supabase\.co/.test(value);
      return ok ? null : 'Should be a valid supabase URL (https://*.supabase.co)';
    }
    default:
      return null;
  }
}

// Main execution
function main() {
  printHeader();

  const envFileExists = checkEnvFile();

  if (!envFileExists) {
    process.exit(1);
  }

  const envVars = loadEnvFile();
  const allRequiredPresent = checkRequiredVars(envVars);
  const allProductionPresent = checkProductionRequiredVars(envVars);
  checkOptionalVars(envVars);
  printSummary(allRequiredPresent && allProductionPresent);

  if (!allRequiredPresent || !allProductionPresent) {
    process.exit(1);
  }
}

main();
