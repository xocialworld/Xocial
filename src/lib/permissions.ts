import { UserRole, WorkspaceMembership, Permission } from '@/types/auth';

/**
 * Role hierarchy (higher index = more permissions)
 */
const ROLE_HIERARCHY: UserRole[] = ['client', 'viewer', 'editor', 'admin', 'owner'];

/**
 * Permission definitions for each role
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] },
  ],
  admin: [
    { resource: 'posts', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'members', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'ai', actions: ['create', 'read'] },
    { resource: 'strategy', actions: ['read'] },
  ],
  editor: [
    { resource: 'posts', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'accounts', actions: ['read'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'ai', actions: ['create', 'read'] },
    { resource: 'strategy', actions: ['read'] },
  ],
  viewer: [
    { resource: 'posts', actions: ['read'] },
    { resource: 'accounts', actions: ['read'] },
    { resource: 'campaigns', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'strategy', actions: ['read'] },
  ],
  client: [
    { resource: 'posts', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] },
  ],
};

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions = ROLE_PERMISSIONS[role];

  // Check for wildcard permission (owner)
  const wildcardPermission = permissions.find((p) => p.resource === '*');
  if (wildcardPermission && wildcardPermission.actions.includes(action)) {
    return true;
  }

  // Check for specific resource permission
  const resourcePermission = permissions.find((p) => p.resource === resource);
  if (resourcePermission && resourcePermission.actions.includes(action)) {
    return true;
  }

  return false;
}

/**
 * Check if a role is at least as high as the required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user can manage workspace members
 */
export function canManageMembers(role: UserRole): boolean {
  return hasPermission(role, 'members', 'create') || role === 'owner';
}

/**
 * Check if user can manage social accounts
 */
export function canManageAccounts(role: UserRole): boolean {
  return hasPermission(role, 'accounts', 'create') || hasRole(role, 'admin');
}

/**
 * Check if user can create posts
 */
export function canCreatePosts(role: UserRole): boolean {
  return hasPermission(role, 'posts', 'create');
}

/**
 * Check if user can delete posts
 */
export function canDeletePosts(role: UserRole): boolean {
  return hasPermission(role, 'posts', 'delete');
}

/**
 * Check if user can use AI features
 */
export function canUseAI(role: UserRole): boolean {
  return hasPermission(role, 'ai', 'create');
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(role: UserRole): boolean {
  return hasPermission(role, 'analytics', 'read');
}

/**
 * Check if user can manage campaigns
 */
export function canManageCampaigns(role: UserRole): boolean {
  return hasPermission(role, 'campaigns', 'create');
}

/**
 * Get user's workspace membership and check permissions
 */
export function getUserWorkspaceRole(
  workspaces: WorkspaceMembership[],
  workspaceId: string
): UserRole | null {
  const membership = workspaces.find((w) => w.workspace_id === workspaceId);
  return membership?.role || null;
}

/**
 * Check if user has access to workspace
 */
export function hasWorkspaceAccess(
  workspaces: WorkspaceMembership[],
  workspaceId: string
): boolean {
  return workspaces.some((w) => w.workspace_id === workspaceId);
}

/**
 * Filter workspaces by role
 */
export function filterWorkspacesByRole(
  workspaces: WorkspaceMembership[],
  minRole: UserRole
): WorkspaceMembership[] {
  return workspaces.filter((w) => hasRole(w.role, minRole));
}

/**
 * Get highest role across all workspaces
 */
export function getHighestRole(workspaces: WorkspaceMembership[]): UserRole | null {
  if (workspaces.length === 0) return null;

  return workspaces.reduce((highest, current) => {
    const currentIndex = ROLE_HIERARCHY.indexOf(current.role);
    const highestIndex = ROLE_HIERARCHY.indexOf(highest);
    return currentIndex > highestIndex ? current.role : highest;
  }, workspaces[0].role);
}

/**
 * Permission guard for UI components
 */
export function PermissionGuard({
  role,
  resource,
  action,
  children,
  fallback = null,
}: {
  role: UserRole;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  if (hasPermission(role, resource, action)) {
    return children;
  }
  return fallback;
}

/**
 * Role guard for UI components
 */
export function RoleGuard({
  userRole,
  requiredRole,
  children,
  fallback = null,
}: {
  userRole: UserRole;
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  if (hasRole(userRole, requiredRole)) {
    return children;
  }
  return fallback;
}

