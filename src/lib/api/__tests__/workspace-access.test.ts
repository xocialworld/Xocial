/**
 * Workspace Access Utility Tests
 * Tests for workspace access verification and role hierarchy
 */

import { verifyWorkspaceAccess, verifyResourceAccess, isWorkspaceOwner, getUserWorkspaces, getWorkspaceIdFromResource } from '../api/workspace-access';
import { APIError } from '../api-error';

// Mock Supabase client
const createMockSupabaseClient = () => {
    return {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    } as any;
};

describe('Workspace Access Utility', () => {
    describe('verifyWorkspaceAccess', () => {
        it('should succeed with valid membership', async () => {
            const supabase = createMockSupabaseClient();
            const mockMembership = { role: 'member', workspace_id: 'ws-123', user_id: 'user-123' };

            supabase.from().single.mockResolvedValue({ data: mockMembership, error: null });

            const result = await verifyWorkspaceAccess(supabase, 'ws-123', 'user-123');

            expect(result).toEqual(mockMembership);
            expect(supabase.from).toHaveBeenCalledWith('workspace_members');
        });

        it('should throw forbidden error for non-member', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            await expect(
                verifyWorkspaceAccess(supabase, 'ws-123', 'user-123')
            ).rejects.toThrow('You do not have access to this workspace');
        });

        it('should verify role hierarchy - owner can access', async () => {
            const supabase = createMockSupabaseClient();
            const mockMembership = { role: 'owner', workspace_id: 'ws-123', user_id: 'user-123' };

            supabase.from().single.mockResolvedValue({ data: mockMembership, error: null });

            const result = await verifyWorkspaceAccess(supabase, 'ws-123', 'user-123', 'admin');

            expect(result).toEqual(mockMembership);
        });

        it('should verify role hierarchy - member cannot access admin-only', async () => {
            const supabase = createMockSupabaseClient();
            const mockMembership = { role: 'member', workspace_id: 'ws-123', user_id: 'user-123' };

            supabase.from().single.mockResolvedValue({ data: mockMembership, error: null });

            await expect(
                verifyWorkspaceAccess(supabase, 'ws-123', 'user-123', 'admin')
            ).rejects.toThrow('This action requires admin role or higher');
        });

        it('should verify role hierarchy - admin can access admin-only', async () => {
            const supabase = createMockSupabaseClient();
            const mockMembership = { role: 'admin', workspace_id: 'ws-123', user_id: 'user-123' };

            supabase.from().single.mockResolvedValue({ data: mockMembership, error: null });

            const result = await verifyWorkspaceAccess(supabase, 'ws-123', 'user-123', 'admin');

            expect(result).toEqual(mockMembership);
        });
    });

    describe('getWorkspaceIdFromResource', () => {
        it('should return workspace ID from resource', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({
                data: { workspace_id: 'ws-123' },
                error: null
            });

            const workspaceId = await getWorkspaceIdFromResource(supabase, 'posts', 'post-123');

            expect(workspaceId).toBe('ws-123');
            expect(supabase.from).toHaveBeenCalledWith('posts');
        });

        it('should throw not found error for missing resource', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            await expect(
                getWorkspaceIdFromResource(supabase, 'posts', 'post-123')
            ).rejects.toThrow('Resource not found in posts');
        });
    });

    describe('verifyResourceAccess', () => {
        it('should verify access to resource', async () => {
            const supabase = createMockSupabaseClient();
            const mockMembership = { role: 'member', workspace_id: 'ws-123', user_id: 'user-123' };

            // First call for resource lookup
            supabase.from().single
                .mockResolvedValueOnce({ data: { workspace_id: 'ws-123' }, error: null })
                // Second call for membership check
                .mockResolvedValueOnce({ data: mockMembership, error: null });

            const result = await verifyResourceAccess(supabase, 'posts', 'post-123', 'user-123');

            expect(result).toEqual(mockMembership);
        });
    });

    describe('isWorkspaceOwner', () => {
        it('should return true for owner', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({
                data: { role: 'owner', workspace_id: 'ws-123', user_id: 'user-123' },
                error: null
            });

            const result = await isWorkspaceOwner(supabase, 'ws-123', 'user-123');

            expect(result).toBe(true);
        });

        it('should return false for non-owner', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({
                data: { role: 'member', workspace_id: 'ws-123', user_id: 'user-123' },
                error: null
            });

            const result = await isWorkspaceOwner(supabase, 'ws-123', 'user-123');

            expect(result).toBe(false);
        });

        it('should return false for non-member', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            const result = await isWorkspaceOwner(supabase, 'ws-123', 'user-123');

            expect(result).toBe(false);
        });
    });

    describe('getUserWorkspaces', () => {
        it('should return all workspace IDs for user', async () => {
            const supabase = createMockSupabaseClient();
            const mockData = [
                { workspace_id: 'ws-1' },
                { workspace_id: 'ws-2' },
                { workspace_id: 'ws-3' },
            ];

            supabase.from().single = undefined;
            supabase.from = jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
            })) as any;

            const result = await getUserWorkspaces(supabase, 'user-123');

            expect(result).toEqual(['ws-1', 'ws-2', 'ws-3']);
        });

        it('should return empty array on error', async () => {
            const supabase = createMockSupabaseClient();
            supabase.from = jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
            })) as any;

            const result = await getUserWorkspaces(supabase, 'user-123');

            expect(result).toEqual([]);
        });
    });
});
