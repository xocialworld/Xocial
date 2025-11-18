#!/usr/bin/env node

/**
 * Interactive Environment Setup Wizard
 * 
 * This script helps developers set up their .env.local file
 * by generating secure secrets and prompting for required credentials.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ANSI color codes
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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Generate a secure random hex string
 */
async function generateSecret(bytes = 32) {
  try {
    const { stdout } = await execAsync(`openssl rand -hex ${bytes}`);
    return stdout.trim();
  } catch (error) {
    console.error(`${red}Error generating secret:${reset}`, error.message);
    // Fallback to Node.js crypto if openssl is not available
    const crypto = require('crypto');
    return crypto.randomBytes(bytes).toString('hex');
  }
}

/**
 * Print welcome banner
 */
function printBanner() {
  console.clear();
  console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}`);
  console.log(`${cyan}${bold}   XOCIAL - Environment Setup Wizard${reset}`);
  console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`);
  console.log(`${yellow}This wizard will help you set up your .env.local file.${reset}`);
  console.log(`${yellow}Press Ctrl+C at any time to cancel.${reset}\n`);
}

/**
 * Check if .env.local already exists
 */
function checkExistingEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  return fs.existsSync(envPath);
}

/**
 * Ask yes/no question
 */
async function confirm(message, defaultValue = false) {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await question(`${message} ${cyan}(${defaultText})${reset}: `);
  
  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

/**
 * Ask for input with validation
 */
async function promptWithValidation(message, validator, defaultValue = '') {
  while (true) {
    const defaultText = defaultValue ? ` ${cyan}(default: ${defaultValue})${reset}` : '';
    const answer = await question(`${message}${defaultText}: `);
    const value = answer || defaultValue;
    
    if (!validator) return value;
    
    const validation = validator(value);
    if (validation === true) return value;
    
    console.log(`${red}✗ ${validation}${reset}\n`);
  }
}

/**
 * Main setup flow
 */
async function setup() {
  try {
    printBanner();
    
    // Check if .env.local exists
    const envExists = checkExistingEnv();
    if (envExists) {
      console.log(`${yellow}⚠️  .env.local already exists!${reset}\n`);
      const shouldContinue = await confirm('Do you want to backup and recreate it?', false);
      
      if (!shouldContinue) {
        console.log(`\n${cyan}Setup cancelled. Your existing .env.local was not modified.${reset}\n`);
        rl.close();
        return;
      }
      
      // Backup existing file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `.env.local.backup.${timestamp}`;
      fs.copyFileSync('.env.local', backupPath);
      console.log(`${green}✓ Backed up to: ${backupPath}${reset}\n`);
    }
    
    console.log(`${bold}Let's set up your environment variables!${reset}\n`);
    
    // Collect environment variables
    const envVars = {};
    
    // ─── Supabase Configuration ───
    console.log(`${cyan}${bold}━━━ Supabase Configuration ━━━${reset}\n`);
    console.log(`Get these from: ${blue}https://app.supabase.com/project/_/settings/api${reset}\n`);
    
    envVars.NEXT_PUBLIC_SUPABASE_URL = await promptWithValidation(
      'Supabase Project URL',
      (val) => {
        if (!val) return 'This field is required';
        if (!val.match(/^https:\/\/.+\.supabase\.co$/)) {
          return 'Must be a valid Supabase URL (https://*.supabase.co)';
        }
        return true;
      }
    );
    
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = await promptWithValidation(
      'Supabase Anon Key',
      (val) => val ? true : 'This field is required'
    );
    
    envVars.SUPABASE_SERVICE_ROLE_KEY = await promptWithValidation(
      'Supabase Service Role Key',
      (val) => val ? true : 'This field is required'
    );
    
    // ─── Vercel AI Gateway Configuration ───
    console.log(`\n${cyan}${bold}━━━ Vercel AI Gateway Configuration ━━━${reset}\n`);
    console.log(`Get from: ${blue}https://vercel.com/dashboard/ai-gateway${reset}\n`);
    
    envVars.VERCEL_AI_GATEWAY_API_KEY = await promptWithValidation(
      'Vercel AI Gateway API Key',
      (val) => {
        if (!val) return 'This field is required';
        if (!val.startsWith('sk-')) return 'AI Gateway keys typically start with "sk-"';
        return true;
      }
    );
    
    // ─── Security & Encryption ───
    console.log(`\n${cyan}${bold}━━━ Security & Encryption ━━━${reset}\n`);
    console.log(`${yellow}Generating secure secrets...${reset}\n`);
    
    envVars.ENCRYPTION_KEY = await generateSecret(32);
    console.log(`${green}✓ Generated ENCRYPTION_KEY${reset}`);
    
    envVars.CRON_SECRET = await generateSecret(32);
    console.log(`${green}✓ Generated CRON_SECRET${reset}`);
    
    // ─── Application URL ───
    console.log(`\n${cyan}${bold}━━━ Application Configuration ━━━${reset}\n`);
    
    envVars.NEXT_PUBLIC_APP_URL = await promptWithValidation(
      'Application URL',
      null,
      'http://localhost:3000'
    );
    
    // ─── Optional OAuth Credentials ───
    console.log(`\n${cyan}${bold}━━━ OAuth Credentials (Optional) ━━━${reset}\n`);
    console.log(`${yellow}You can skip these and add them later if needed.${reset}\n`);
    
    const setupOAuth = await confirm('Do you want to set up OAuth credentials now?', false);
    
    if (setupOAuth) {
      // Facebook
      const setupFacebook = await confirm('\nSet up Facebook/Meta OAuth?', false);
      if (setupFacebook) {
        envVars.FACEBOOK_APP_ID = await question('Facebook App ID: ');
        envVars.FACEBOOK_APP_SECRET = await question('Facebook App Secret: ');
        envVars.FACEBOOK_WEBHOOK_VERIFY_TOKEN = await generateSecret(32);
        console.log(`${green}✓ Generated webhook verify token${reset}`);
      }
      
      // Instagram
      const setupInstagram = await confirm('\nSet up Instagram OAuth?', false);
      if (setupInstagram) {
        envVars.INSTAGRAM_CLIENT_ID = await question('Instagram Client ID: ');
        envVars.INSTAGRAM_CLIENT_SECRET = await question('Instagram Client Secret: ');
        envVars.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = await generateSecret(32);
        console.log(`${green}✓ Generated webhook verify token${reset}`);
      }
      
      // Twitter
      const setupTwitter = await confirm('\nSet up Twitter/X OAuth?', false);
      if (setupTwitter) {
        envVars.TWITTER_CLIENT_ID = await question('Twitter Client ID: ');
        envVars.TWITTER_CLIENT_SECRET = await question('Twitter Client Secret: ');
        envVars.TWITTER_BEARER_TOKEN = await question('Twitter Bearer Token (optional): ');
      }
      
      // LinkedIn
      const setupLinkedIn = await confirm('\nSet up LinkedIn OAuth?', false);
      if (setupLinkedIn) {
        envVars.LINKEDIN_CLIENT_ID = await question('LinkedIn Client ID: ');
        envVars.LINKEDIN_CLIENT_SECRET = await question('LinkedIn Client Secret: ');
      }
      
      // YouTube
      const setupYouTube = await confirm('\nSet up YouTube OAuth?', false);
      if (setupYouTube) {
        envVars.YOUTUBE_CLIENT_ID = await question('YouTube Client ID: ');
        envVars.YOUTUBE_CLIENT_SECRET = await question('YouTube Client Secret: ');
      }
      
      // TikTok
      const setupTikTok = await confirm('\nSet up TikTok OAuth?', false);
      if (setupTikTok) {
        envVars.TIKTOK_CLIENT_KEY = await question('TikTok Client Key: ');
        envVars.TIKTOK_CLIENT_SECRET = await question('TikTok Client Secret: ');
      }
    }
    
    // ─── Write .env.local file ───
    console.log(`\n${cyan}${bold}━━━ Writing .env.local ━━━${reset}\n`);
    
    let envContent = `# ═══════════════════════════════════════════════════════════
# XOCIAL PLATFORM - Environment Variables
# ═══════════════════════════════════════════════════════════
#
# Generated by: setup-env.js
# Date: ${new Date().toISOString()}
#
# NEVER commit this file to version control!
#
# ═══════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────
# NODE ENVIRONMENT
# ───────────────────────────────────────────────────────────
NODE_ENV=development

`;
    
    // Add Supabase section
    if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
      envContent += `# ───────────────────────────────────────────────────────────
# SUPABASE CONFIGURATION
# ───────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=${envVars.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${envVars.SUPABASE_SERVICE_ROLE_KEY}

`;
    }
    
    // Add Vercel AI Gateway section
    if (envVars.VERCEL_AI_GATEWAY_API_KEY) {
      envContent += `# ───────────────────────────────────────────────────────────
# VERCEL AI GATEWAY CONFIGURATION
# ───────────────────────────────────────────────────────────
VERCEL_AI_GATEWAY_API_KEY=${envVars.VERCEL_AI_GATEWAY_API_KEY}

`;
    }
    
    // Add Security section
    envContent += `# ───────────────────────────────────────────────────────────
# SECURITY & ENCRYPTION
# ───────────────────────────────────────────────────────────
ENCRYPTION_KEY=${envVars.ENCRYPTION_KEY}
CRON_SECRET=${envVars.CRON_SECRET}

`;
    
    // Add App URL
    envContent += `# ───────────────────────────────────────────────────────────
# APPLICATION CONFIGURATION
# ───────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=${envVars.NEXT_PUBLIC_APP_URL}

`;
    
    // Add OAuth sections if configured
    if (envVars.FACEBOOK_APP_ID) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - FACEBOOK / META
# ───────────────────────────────────────────────────────────
FACEBOOK_APP_ID=${envVars.FACEBOOK_APP_ID}
FACEBOOK_APP_SECRET=${envVars.FACEBOOK_APP_SECRET}
FACEBOOK_WEBHOOK_VERIFY_TOKEN=${envVars.FACEBOOK_WEBHOOK_VERIFY_TOKEN}

`;
    }
    
    if (envVars.INSTAGRAM_CLIENT_ID) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - INSTAGRAM
# ───────────────────────────────────────────────────────────
INSTAGRAM_CLIENT_ID=${envVars.INSTAGRAM_CLIENT_ID}
INSTAGRAM_CLIENT_SECRET=${envVars.INSTAGRAM_CLIENT_SECRET}
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=${envVars.INSTAGRAM_WEBHOOK_VERIFY_TOKEN}

`;
    }
    
    if (envVars.TWITTER_CLIENT_ID) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - TWITTER / X
# ───────────────────────────────────────────────────────────
TWITTER_CLIENT_ID=${envVars.TWITTER_CLIENT_ID}
TWITTER_CLIENT_SECRET=${envVars.TWITTER_CLIENT_SECRET}
${envVars.TWITTER_BEARER_TOKEN ? `TWITTER_BEARER_TOKEN=${envVars.TWITTER_BEARER_TOKEN}` : ''}

`;
    }
    
    if (envVars.LINKEDIN_CLIENT_ID) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - LINKEDIN
# ───────────────────────────────────────────────────────────
LINKEDIN_CLIENT_ID=${envVars.LINKEDIN_CLIENT_ID}
LINKEDIN_CLIENT_SECRET=${envVars.LINKEDIN_CLIENT_SECRET}

`;
    }
    
    if (envVars.YOUTUBE_CLIENT_ID) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - YOUTUBE
# ───────────────────────────────────────────────────────────
YOUTUBE_CLIENT_ID=${envVars.YOUTUBE_CLIENT_ID}
YOUTUBE_CLIENT_SECRET=${envVars.YOUTUBE_CLIENT_SECRET}

`;
    }
    
    if (envVars.TIKTOK_CLIENT_KEY) {
      envContent += `# ───────────────────────────────────────────────────────────
# OAUTH - TIKTOK
# ───────────────────────────────────────────────────────────
TIKTOK_CLIENT_KEY=${envVars.TIKTOK_CLIENT_KEY}
TIKTOK_CLIENT_SECRET=${envVars.TIKTOK_CLIENT_SECRET}

`;
    }
    
    // Write the file
    fs.writeFileSync('.env.local', envContent);
    
    console.log(`${green}${bold}✓ Successfully created .env.local${reset}\n`);
    
    // ─── Summary ───
    console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}`);
    console.log(`${green}${bold}✓ Environment Setup Complete!${reset}`);
    console.log(`${cyan}${bold}═══════════════════════════════════════════════════════════${reset}\n`);
    
    console.log(`${bold}Next steps:${reset}\n`);
    console.log(`  1. Verify your setup: ${cyan}npm run check-env${reset}`);
    console.log(`  2. Run database migrations (if needed)`);
    console.log(`  3. Start development: ${cyan}npm run dev${reset}\n`);
    
    console.log(`${bold}Important:${reset}\n`);
    console.log(`  • Your .env.local file contains sensitive secrets`);
    console.log(`  • Never commit it to version control`);
    console.log(`  • Keep your secrets safe and secure\n`);
    
    if (!setupOAuth) {
      console.log(`${yellow}Note: You skipped OAuth setup. You can add credentials later by editing .env.local${reset}\n`);
    }
    
    rl.close();
    
  } catch (error) {
    console.error(`\n${red}${bold}✗ Error during setup:${reset}`, error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log(`\n\n${yellow}Setup cancelled by user.${reset}\n`);
  rl.close();
  process.exit(0);
});

// Run the setup
setup();

