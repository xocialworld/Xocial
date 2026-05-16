/**
 * Workspace Access Verification Utility
 * Provides reusable workspace access checks for API routes
 * Based on Xocial SRS Security Requirements
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { APIError, APIErrorCode } from '@/lib/api-error';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'creator' | 'analyst' | 'client' | 'member' | 'editor' | 'viewer' | 'guest';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
    owner: 6,
    admin: 5,
    manager: 4,
    creator: 3,
    member: 3,
    editor: 3,
    analyst: 2,
    viewer: 2,
    client: 1,
    guest: 1,
};

/**
 * Verifies that a user has access to a workspace
 * @param supabase - Supabase client instance
 * @param workspaceId - Workspace ID to check access for
 * @param userId - User ID to verify
 * @param requiredRole - Optional minimum role required (defaults to 'member')
 * @returns Workspace membership record
 * @throws APIError if user doesn't have access or insufficient role
 */
export async function verifyWorkspaceAccess(
    supabase: SupabaseClient,
    workspaceId: string,
    userId: string,
    requiredRole?: WorkspaceRole
) {
    // Query workspace membership
    const { data: membership, error } = await supabase
        .from('workspace_members')
        .select('role, workspace_id, user_id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

    // Check if membership exists
    if (error || !membership) {
        throw APIError.forbidden('You do not have access to this workspace');
    }

    // Verify role hierarchy if required role is specified
    if (requiredRole) {
        const userRoleLevel = ROLE_HIERARCHY[membership.role as WorkspaceRole] || 0;
        const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

        if (userRoleLevel < requiredRoleLevel) {
            throw new APIError(
                403,
                APIErrorCode.FORBIDDEN,
                `This action requires ${requiredRole} role or higher`,
                undefined,
                {
                    required_role: requiredRole,
                    current_role: membership.role,
                }
            );
        }
    }

    return membership;
}

/**
 * Gets the workspace ID from a resource (post, account, etc.)
 * @param supabase - Supabase client instance
 * @param table - Table name to query
 * @param resourceId - Resource ID
 * @returns Workspace ID
 * @throws APIError if resource not found
 */
export async function getWorkspaceIdFromResource(
    supabase: SupabaseClient,
    table: string,
    resourceId: string
): Promise<string> {
    const { data, error } = await supabase
        .from(table)
        .select('workspace_id')
        .eq('id', resourceId)
        .single();

    if (error || !data) {
        throw APIError.notFound(table, `Resource not found in ${table}`);
    }

    return data.workspace_id;
}

/**
 * Verifies workspace access for a resource
 * Combines resource lookup and access verification
 * @param supabase - Supabase client instance
 * @param table - Table name containing the resource
 * @param resourceId - Resource ID
 * @param userId - User ID to verify
 * @param requiredRole - Optional minimum role required
 * @returns Workspace membership record
 */
export async function verifyResourceAccess(
    supabase: SupabaseClient,
    table: string,
    resourceId: string,
    userId: string,
    requiredRole?: WorkspaceRole
) {
    const workspaceId = await getWorkspaceIdFromResource(supabase, table, resourceId);
    return verifyWorkspaceAccess(supabase, workspaceId, userId, requiredRole);
}

/**
 * Checks if user is workspace owner
 * @param supabase - Supabase client instance
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns True if user is owner
 */
export async function isWorkspaceOwner(
    supabase: SupabaseClient,
    workspaceId: string,
    userId: string
): Promise<boolean> {
    try {
        const membership = await verifyWorkspaceAccess(supabase, workspaceId, userId);
        return membership.role === 'owner';
    } catch {
        return false;
    }
}

/**
 * Gets all workspaces for a user
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @returns Array of workspace IDs
 */
export async function getUserWorkspaces(
    supabase: SupabaseClient,
    userId: string
): Promise<string[]> {
    const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId);

    if (error || !data) {
        return [];
    }

    return data.map((m) => m.workspace_id);
}
