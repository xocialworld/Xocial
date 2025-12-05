import { createClient } from '@/lib/supabase/client';
import { getAppURL } from '@/lib/url';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  AuthUser, 
  UserProfile, 
  LoginCredentials, 
  SignupData, 
  AuthResponse,
  WorkspaceMembership 
} from '@/types/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client-side authentication helper
 */
export class AuthService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignupData): Promise<AuthResponse<{ user: AuthUser; profile: UserProfile }>> {
    try {
      // Create auth user
      const { data: authData, error: signUpError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
          emailRedirectTo: `${getAppURL()}auth/callback`,
        },
      });

      if (signUpError) {
        return { error: { message: signUpError.message, code: signUpError.code } };
      }

      if (!authData.user) {
        return { error: { message: 'Failed to create user' } };
      }

      // Create profile
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          name: data.name,
        })
        .select()
        .single();

      if (profileError) {
        return { error: { message: profileError.message, code: profileError.code } };
      }

      return {
        data: {
          user: authData.user as AuthUser,
          profile: profileData,
        },
      };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: data.user as AuthUser };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github'): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getAppURL()}auth/callback`,
        },
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthResponse<AuthUser | null>> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: data.user as AuthUser | null };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<AuthResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppURL()}auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${getAppURL()}auth/callback`,
        },
      });

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data: true };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }

  /**
   * Get user workspaces
   */
  async getUserWorkspaces(userId: string): Promise<AuthResponse<WorkspaceMembership[]>> {
    try {
      const { data, error } = await this.supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }

      return { data };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  }
}

/**
 * Server-side authentication helpers
 */
export async function getServerUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function getServerProfile(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    return null;
  }
  
  return data as UserProfile;
}

export async function getServerSession() {
  const user = await getServerUser();
  
  if (!user) {
    return null;
  }
  
  const profile = await getServerProfile(user.id);
  
  if (!profile) {
    return null;
  }
  
  const supabase = await createServerClient();
  const { data: workspaces } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('user_id', user.id);
  
  return {
    user: user as AuthUser,
    profile,
    workspaces: workspaces || [],
  };
}

/**
 * Check if user is authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

/**
 * Singleton instance for client-side usage
 */
export const authService = new AuthService();
