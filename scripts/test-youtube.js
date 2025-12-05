#!/usr/bin/env node

/**
 * YouTube Integration Test Script
 * Tests all YouTube features end-to-end
 * 
 * Usage: node scripts/test-youtube.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_ACCOUNT_ID = process.env.TEST_YOUTUBE_ACCOUNT_ID;
const TEST_VIDEO_URL = process.env.TEST_VIDEO_URL || 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(60), colors.cyan);
  log(title.toUpperCase(), colors.cyan);
  log('═'.repeat(60), colors.cyan);
}

// Make HTTP request
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testEnvironmentVariables() {
  logSection('Environment Variables Check');

  const requiredVars = [
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    logWarning('Some environment variables are missing. Check your .env.local file.');
    return false;
  }

  // Validate ENCRYPTION_KEY format
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length === 64 && /^[0-9a-f]{64}$/i.test(encryptionKey)) {
    logSuccess('ENCRYPTION_KEY format is valid (64 hex chars)');
  } else {
    logError('ENCRYPTION_KEY must be 64 hexadecimal characters');
    return false;
  }

  return true;
}

async function testHealthEndpoint() {
  logSection('Health Check');

  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      logSuccess('Health endpoint is responding');
      logInfo(`Response: ${JSON.stringify(response.body, null, 2)}`);
      return true;
    } else {
      logError(`Health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    logWarning('Make sure the development server is running (npm run dev)');
    return false;
  }
}

async function testOAuthConnect() {
  logSection('OAuth Connect Endpoint');

  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/connect?platform=youtube`);
    
    // OAuth connect should redirect (302/307) or require authentication (401)
    if ([301, 302, 307, 401].includes(response.status)) {
      logSuccess('OAuth connect endpoint is configured');
      if (response.headers.location) {
        logInfo(`Redirects to: ${response.headers.location.substring(0, 50)}...`);
      }
      return true;
    } else {
      logError(`Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`OAuth connect test failed: ${error.message}`);
    return false;
  }
}

async function testYouTubePublishEndpoint() {
  logSection('YouTube Publish Endpoint');

  if (!TEST_ACCOUNT_ID) {
    logWarning('TEST_YOUTUBE_ACCOUNT_ID not set, skipping publish test');
    logInfo('To test publishing: Set TEST_YOUTUBE_ACCOUNT_ID in your environment');
    return null;
  }

  try {
    // This will fail with 401 (no auth), but confirms endpoint exists
    const response = await makeRequest(
      `${BASE_URL}/api/youtube/publish`,
      'POST',
      {
        accountId: TEST_ACCOUNT_ID,
        videoUrl: TEST_VIDEO_URL,
        title: 'Test Video',
        description: 'This is a test',
        privacyStatus: 'private',
      }
    );

    if (response.status === 401) {
      logSuccess('Publish endpoint exists and requires authentication');
      return true;
    } else if (response.status === 200) {
      logSuccess('Publish endpoint is working!');
      logInfo(`Response: ${JSON.stringify(response.body, null, 2)}`);
      return true;
    } else {
      logError(`Unexpected status: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`Publish endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testYouTubeAnalyticsEndpoint() {
  logSection('YouTube Analytics Endpoint');

  if (!TEST_ACCOUNT_ID) {
    logWarning('TEST_YOUTUBE_ACCOUNT_ID not set, skipping analytics test');
    return null;
  }

  try {
    const response = await makeRequest(
      `${BASE_URL}/api/youtube/analytics?accountId=${TEST_ACCOUNT_ID}`
    );

    if (response.status === 401) {
      logSuccess('Analytics endpoint exists and requires authentication');
      return true;
    } else if (response.status === 200) {
      logSuccess('Analytics endpoint is working!');
      return true;
    } else {
      logError(`Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Analytics endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testCronEndpoints() {
  logSection('Cron Job Endpoints');

  const cronEndpoints = [
    '/api/cron/publish',
    '/api/cron/sync-youtube-analytics',
    '/api/cron/refresh-youtube-tokens',
  ];

  let allGood = true;

  for (const endpoint of cronEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      
      // Cron endpoints should reject without proper authorization (401/403)
      if ([401, 403].includes(response.status)) {
        logSuccess(`${endpoint} - Protected correctly`);
      } else if (response.status === 200) {
        logSuccess(`${endpoint} - Responding`);
        logInfo(`Response: ${JSON.stringify(response.body, null, 2)}`);
      } else {
        logError(`${endpoint} - Unexpected status: ${response.status}`);
        allGood = false;
      }
    } catch (error) {
      logError(`${endpoint} - Error: ${error.message}`);
      allGood = false;
    }
  }

  return allGood;
}

async function testFileStructure() {
  logSection('File Structure Check');

  const fs = require('fs');
  const path = require('path');

  const requiredFiles = [
    'src/lib/oauth/youtube.ts',
    'src/lib/platforms/youtube.ts',
    'src/lib/platforms/youtube-analytics.ts',
    'src/lib/platforms/publisher.ts',
    'src/app/api/auth/youtube/callback/route.ts',
    'src/app/api/youtube/publish/route.ts',
    'src/app/api/youtube/analytics/route.ts',
    'src/app/api/cron/sync-youtube-analytics/route.ts',
    'src/app/api/cron/refresh-youtube-tokens/route.ts',
  ];

  let allPresent = true;

  for (const file of requiredFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} is missing`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function printTestSummary(results) {
  logSection('Test Summary');

  const passed = Object.values(results).filter(r => r === true).length;
  const failed = Object.values(results).filter(r => r === false).length;
  const skipped = Object.values(results).filter(r => r === null).length;
  const total = Object.values(results).length;

  console.log('');
  logInfo(`Total Tests: ${total}`);
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  if (skipped > 0) {
    logWarning(`Skipped: ${skipped}`);
  }

  console.log('');
  
  if (failed === 0 && skipped === 0) {
    log('🎉 All tests passed! YouTube integration is ready.', colors.green);
  } else if (failed === 0) {
    log('✓ Core tests passed. Some tests were skipped.', colors.yellow);
    logInfo('Set TEST_YOUTUBE_ACCOUNT_ID to run all tests');
  } else {
    log('⚠️  Some tests failed. Review the errors above.', colors.red);
  }

  console.log('');
}

// Main test runner
async function runTests() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║         YOUTUBE INTEGRATION TEST SUITE                     ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  console.log('');

  const results = {};

  // Run all tests
  results.envVars = await testEnvironmentVariables();
  results.fileStructure = await testFileStructure();
  results.health = await testHealthEndpoint();
  
  if (results.health) {
    results.oauthConnect = await testOAuthConnect();
    results.publishEndpoint = await testYouTubePublishEndpoint();
    results.analyticsEndpoint = await testYouTubeAnalyticsEndpoint();
    results.cronEndpoints = await testCronEndpoints();
  } else {
    logWarning('Skipping API tests because server is not running');
    results.oauthConnect = null;
    results.publishEndpoint = null;
    results.analyticsEndpoint = null;
    results.cronEndpoints = null;
  }

  // Print summary
  await printTestSummary(results);

  // Exit with appropriate code
  const hasFailed = Object.values(results).some(r => r === false);
  process.exit(hasFailed ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
