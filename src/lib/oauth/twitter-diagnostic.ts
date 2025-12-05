/**
 * Twitter OAuth Configuration Diagnostic
 * Run this to verify your Twitter OAuth setup
 */

export function diagnoseTwitterOAuth() {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check environment variables
    if (!process.env.TWITTER_CLIENT_ID) {
        issues.push('❌ TWITTER_CLIENT_ID is not set');
    } else {
        console.log('✅ TWITTER_CLIENT_ID is set');
    }

    if (!process.env.TWITTER_CLIENT_SECRET) {
        issues.push('❌ TWITTER_CLIENT_SECRET is not set');
    } else {
        console.log('✅ TWITTER_CLIENT_SECRET is set');
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
        warnings.push('⚠️  NEXT_PUBLIC_APP_URL is not set (will default to request origin)');
    } else {
        console.log(`✅ NEXT_PUBLIC_APP_URL is set to: ${process.env.NEXT_PUBLIC_APP_URL}`);
    }

    if (!process.env.ENCRYPTION_KEY) {
        issues.push('❌ ENCRYPTION_KEY is not set (required for token storage)');
    } else {
        console.log('✅ ENCRYPTION_KEY is set');
    }

    // Calculate expected callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/api/auth/twitter/callback`;

    console.log('\n📍 Expected Callback URL:');
    console.log(`   ${callbackUrl}`);
    console.log('\n⚠️  This MUST match EXACTLY in your Twitter Developer Portal!');
    console.log('   Go to: https://developer.twitter.com/en/portal/dashboard');
    console.log('   → Select your app');
    console.log('   → User authentication settings');
    console.log('   → Callback URI / Redirect URL');

    // Print summary
    console.log('\n' + '='.repeat(60));
    if (issues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (issues.length === 0 && warnings.length === 0) {
        console.log('\n✅ All environment variables are configured!');
    }

    console.log('\n' + '='.repeat(60));

    return {
        hasIssues: issues.length > 0,
        issues,
        warnings,
        callbackUrl,
    };
}

// Run diagnostic if executed directly
if (typeof window === 'undefined') {
    diagnoseTwitterOAuth();
}
