#!/usr/bin/env node

/**
 *  OAuth Configuration Checker
 *
 * This script verifies that all necessary environment variables and OAuth
 * configurations are properly set up for Xocial platform connections.
 */

console.log('\n🔍 Checking OAuth Configuration...\n');

const requiredEnvVars = {
  YouTube: {
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
  },
  Facebook: {
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    FACEBOOK_LOGIN_CONFIG_ID: process.env.FACEBOOK_LOGIN_CONFIG_ID,
  },
  'Instagram Professional Account': {
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID,
    INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET,
  },
  'Instagram via Facebook Page': {
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    'INSTAGRAM_FACEBOOK_LOGIN_CONFIG_ID or INSTAGRAM_LOGIN_CONFIG_ID':
      process.env.INSTAGRAM_FACEBOOK_LOGIN_CONFIG_ID || process.env.INSTAGRAM_LOGIN_CONFIG_ID,
  },
  Twitter: {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  },
  LinkedIn: {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  },
  TikTok: {
    TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
  },
};

const appConfig = {
  'App URL': process.env.NEXT_PUBLIC_APP_URL,
  'Encryption Key': process.env.ENCRYPTION_KEY,
};

let hasErrors = false;
let hasWarnings = false;

// Check app configuration
console.log('📋 App Configuration:');
console.log('─'.repeat(60));

if (appConfig['App URL']) {
  console.log(`✅ NEXT_PUBLIC_APP_URL: ${appConfig['App URL']}`);
} else {
  hasWarnings = true;
  console.log('⚠️  NEXT_PUBLIC_APP_URL: Not set (will default to localhost:3000)');
}

if (appConfig['Encryption Key']) {
  const keyLength = appConfig['Encryption Key'].length;
  if (keyLength >= 32) {
    console.log(`✅ ENCRYPTION_KEY: Set (${keyLength} characters)`);
  } else {
    hasErrors = true;
    console.log(`❌ ENCRYPTION_KEY: Too short (${keyLength} characters, need at least 32)`);
  }
} else {
  hasErrors = true;
  console.log('❌ ENCRYPTION_KEY: Not set');
}

console.log();

// Check each platform
for (const [platform, envVars] of Object.entries(requiredEnvVars)) {
  console.log(`🔐 ${platform} OAuth:  `);
  console.log('─'.repeat(60));

  let platformConfigured = true;

  for (const [varName, value] of Object.entries(envVars)) {
    if (value) {
      const displayValue = value.length > 20 ? value.substring(0, 15) + '...' : value;
      console.log(`  ✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${varName}: Not set`);
      platformConfigured = false;
      hasErrors = true;
    }
  }

  if (platformConfigured) {
    const appUrl = appConfig['App URL'] || 'http://localhost:3000';
    const callbackUrl =
      platform === 'Instagram via Facebook Page'
        ? `${appUrl}/api/auth/instagram/facebook/callback`
        : platform === 'Instagram Professional Account'
          ? `${appUrl}/api/auth/instagram/callback`
          : `${appUrl}/api/auth/${platform.toLowerCase()}/callback`;
    console.log(`  📍 Callback URL: ${callbackUrl}`);
    console.log(`  ℹ️   Add this URL to your ${platform} OAuth app settings`);
  }

  console.log();
}

// Summary
console.log('─'.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration has errors. Please fix the issues above.');
  console.log('\n💡 Create a .env.local file with the required variables.');
  console.log('   See .env.example for reference.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Configuration has warnings but should work.');
  console.log('   Consider setting all optional variables for production.\n');
  process.exit(0);
} else {
  console.log('✅ All OAuth configurations are properly set!\n');
  console.log('🚀 Next steps:');
  console.log('   1. Verify callback URLs in each OAuth provider console');
  console.log('   2. Restart your dev server: npm run dev');
  console.log('   3. Test connections at http://localhost:3000/x\n');
  process.exit(0);
}
