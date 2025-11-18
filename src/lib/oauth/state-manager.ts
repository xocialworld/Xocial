/**
 * OAuth State Management
 * Provides secure state parameter generation and verification for OAuth flows
 */

import { createClient } from '@/lib/supabase/server';
import type { PostgrestError } from '@supabase/supabase-js';
import crypto from 'crypto';

// State tokens expire after 10 minutes
const STATE_EXPIRY_MS = 10 * 60 * 1000;

export interface OAuthState {
  state: string;
  userId: string;
  platform: string;
  createdAt: number;
  redirectUrl?: string;
  pkceVerifier?: string;
}

/**
 * Generate a secure random state parameter
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

type GlobalWithOAuthStore = typeof globalThis & {
  __oauthStateFallbackStore?: Map<string, OAuthState>;
};

const globalWithStore = globalThis as GlobalWithOAuthStore;

const fallbackStore =
  globalWithStore.__oauthStateFallbackStore ?? new Map<string, OAuthState>();

if (!globalWithStore.__oauthStateFallbackStore) {
  globalWithStore.__oauthStateFallbackStore = fallbackStore;
}

const FALLBACK_LOG_PREFIX = '[oauth-state]';

function fallbackKey(userId: string, platform: string) {
  return `${userId}:${platform}`;
}

function cacheFallbackState(stateData: OAuthState) {
  fallbackStore.set(fallbackKey(stateData.userId, stateData.platform), stateData);
}

function clearFallbackState(userId: string, platform: string) {
  fallbackStore.delete(fallbackKey(userId, platform));
}

function getFallbackState(userId: string, platform: string): OAuthState | null {
  const state = fallbackStore.get(fallbackKey(userId, platform));

  if (!state) {
    return null;
  }

  if (Date.now() - state.createdAt > STATE_EXPIRY_MS) {
    fallbackStore.delete(fallbackKey(userId, platform));
    return null;
  }

  return state;
}

function isMissingOAuthColumn(error: PostgrestError | null): boolean {
  if (!error) {
    return false;
  }

  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return message.includes('oauth_state') && message.includes('column');
}

function validateStateRecord(
  storedState: OAuthState | null,
  platform: string,
  state: string
): { valid: boolean; redirectUrl?: string; pkceVerifier?: string; error?: string } {
  if (!storedState) {
    return { valid: false, error: 'No OAuth state found' };
  }

  if (storedState.state !== state) {
    return { valid: false, error: 'State parameter mismatch - possible CSRF attack' };
  }

  if (storedState.platform !== platform) {
    return { valid: false, error: 'Platform mismatch' };
  }

  if (Date.now() - storedState.createdAt > STATE_EXPIRY_MS) {
    return { valid: false, error: 'State has expired' };
  }

  return {
    valid: true,
    redirectUrl: storedState.redirectUrl,
    pkceVerifier: storedState.pkceVerifier,
  };
}

/**
 * Store OAuth state in database (for verification later)
 */
type SupabaseClientFactory = () => ReturnType<typeof createClient>;

let createClientFactory: SupabaseClientFactory = createClient;

export function __setSupabaseClientFactory(factory: SupabaseClientFactory) {
  createClientFactory = factory;
}

export function __resetSupabaseClientFactory() {
  createClientFactory = createClient;
}

async function getSupabaseClient() {
  return createClientFactory();
}

export async function storeOAuthState(
  userId: string,
  platform: string,
  state: string,
  redirectUrl?: string,
  options?: {
    pkceVerifier?: string;
  }
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  const stateData: OAuthState = {
    state,
    userId,
    platform,
    createdAt: Date.now(),
    redirectUrl,
    ...(options?.pkceVerifier ? { pkceVerifier: options.pkceVerifier } : {}),
  };

  clearFallbackState(userId, platform);

  const { error } = await supabase
    .from('profiles')
    .update({
      oauth_state: stateData,
    })
    .eq('id', userId)
    .select('id')
    .single();

  if (error) {
    if (isMissingOAuthColumn(error)) {
      console.warn(
        `${FALLBACK_LOG_PREFIX} profiles.oauth_state missing; using in-memory fallback store. Did you run the latest Supabase migrations?`
      );
      cacheFallbackState(stateData);
      return;
    }

    throw new Error(`Failed to store OAuth state: ${error.message}`);
  }
}

/**
 * Verify OAuth state parameter matches stored value
 */
export async function verifyOAuthState(
  userId: string,
  platform: string,
  state: string
): Promise<{ valid: boolean; redirectUrl?: string; pkceVerifier?: string; error?: string }> {
  if (!state) {
    return { valid: false, error: 'State parameter is missing' };
  }

  const supabase = await getSupabaseClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('oauth_state')
    .eq('id', userId)
    .single();

  if (error) {
    if (isMissingOAuthColumn(error)) {
      return verifyWithFallback(userId, platform, state);
    }

    return { valid: false, error: 'Failed to retrieve OAuth state' };
  }

  const storedState = profile.oauth_state as OAuthState | null;

  if (!storedState) {
    return verifyWithFallback(userId, platform, state);
  }

  const validation = validateStateRecord(storedState, platform, state);

  if (!validation.valid) {
    return validation;
  }

  await clearDatabaseState(supabase, userId);
  clearFallbackState(userId, platform);

  return validation;
}

/**
 * Clean up expired OAuth states (can be run periodically)
 */
export async function cleanupExpiredStates(): Promise<number> {
  let cleaned = 0;
  const now = Date.now();

  for (const [key, state] of fallbackStore.entries()) {
    if (now - state.createdAt > STATE_EXPIRY_MS) {
      fallbackStore.delete(key);
      cleaned += 1;
    }
  }

  return cleaned;
}

function verifyWithFallback(
  userId: string,
  platform: string,
  state: string
): { valid: boolean; redirectUrl?: string; pkceVerifier?: string; error?: string } {
  const cachedState = getFallbackState(userId, platform);

  if (!cachedState) {
    return { valid: false, error: 'No OAuth state found' };
  }

  const validation = validateStateRecord(cachedState, platform, state);

  if (validation.valid) {
    clearFallbackState(userId, platform);
  }

  return validation;
}

async function clearDatabaseState(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ oauth_state: null })
    .eq('id', userId)
    .select('id')
    .single();

  if (error && !isMissingOAuthColumn(error)) {
    console.warn(`${FALLBACK_LOG_PREFIX} failed to clear oauth_state column`, error.message);
  }
}

