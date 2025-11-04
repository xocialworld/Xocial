import { User } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'client';

export interface AuthUser extends User {
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  notification_preferences?: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  in_app: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  permissions: Permission[];
  joined_at: string;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface AuthSession {
  user: AuthUser;
  profile: UserProfile;
  workspaces: WorkspaceMembership[];
  activeWorkspace?: WorkspaceMembership;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: AuthError;
}

