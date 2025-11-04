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
    name: 'OPENAI_API_KEY',
    description: 'Your OpenAI API key',
    example: 'sk-...',
    getFrom: 'https://platform.openai.com/api-keys',
  },
];

// Optional environment variables
const OPTIONAL_VARS = [
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Application URL (defaults to http://localhost:3000)',
    example: 'http://localhost:3000',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (for admin operations)',
    example: 'eyJhbGc...',
  },
];

function printHeader() {
  console.log(`\n${cyan}${bold}═══════════════════════════════════════════════════════════${reset}`);
  console.log(`${cyan}${bold}   XOCIAL - Environment Variables Checker${reset}`);
  console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`);
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

  envContent.split('\n').forEach(line => {
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

  REQUIRED_VARS.forEach(({ name, description, example, getFrom }) => {
    const value = envVars[name];
    const isPresent = value && value.length > 0 && !value.includes('your_') && !value.includes('your-');

    if (isPresent) {
      const maskedValue = maskValue(value, name);
      console.log(`  ${green}✓${reset} ${name}`);
      console.log(`    ${cyan}→ ${maskedValue}${reset}`);
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
  }

  return allPresent;
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
  console.log(`${cyan}# OpenAI Configuration${reset}`);
  console.log(`OPENAI_API_KEY=your_openai_api_key_here\n`);
  console.log(`${cyan}# Application Configuration${reset}`);
  console.log(`NEXT_PUBLIC_APP_URL=http://localhost:3000\n`);
}

function printSummary(allGood) {
  console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`);
  
  if (allGood) {
    console.log(`${green}${bold}✓ All required environment variables are configured!${reset}\n`);
    console.log(`${bold}Next steps:${reset}`);
    console.log(`  1. Run the database migration (see SETUP_GUIDE.md)`);
    console.log(`  2. Start the development server: ${cyan}npm run dev${reset}\n`);
  } else {
    console.log(`${red}${bold}✗ Environment setup is incomplete${reset}\n`);
    console.log(`${bold}Please fix the issues above before running the application.${reset}\n`);
    console.log(`${bold}📚 Resources:${reset}`);
    console.log(`  • Detailed guide: ${cyan}./ENV_SETUP.md${reset}`);
    console.log(`  • Setup guide: ${cyan}./SETUP_GUIDE.md${reset}\n`);
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
  checkOptionalVars(envVars);
  printSummary(allRequiredPresent);

  if (!allRequiredPresent) {
    process.exit(1);
  }
}

main();

