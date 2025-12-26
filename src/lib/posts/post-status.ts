/**
 * Unified Post Status Constants
 * 
 * Single source of truth for post status values, labels, and styling.
 * All status-related logic should reference this file.
 */

/**
 * All valid post status values
 * 
 * Status flow:
 * - draft: Initial creation, not ready for review/publish
 * - pending_approval: Submitted for review by approvers
 * - approved: Approved but not yet scheduled/published
 * - rejected: Rejected by approver, needs revision
 * - scheduled: Approved and scheduled for future publish
 * - publishing: Currently being published (transient state)
 * - published: Successfully published to all platforms
 * - partial: Published to some platforms, failed on others
 * - failed: Failed to publish to any platform
 * - archived: Removed from active view but retained for history
 */
export const POST_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'scheduled',
  'publishing',
  'published',
  'partial',
  'failed',
  'archived',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * Status values that appear in the calendar by default
 */
export const CALENDAR_VISIBLE_STATUSES: PostStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'partial',
  'failed',
];

/**
 * Status values that can be filtered in the calendar UI
 */
export const FILTERABLE_STATUSES: PostStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'published',
  'failed',
  'rejected',
];

/**
 * Status values that indicate the post is "active" (not terminal)
 */
export const ACTIVE_STATUSES: PostStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'publishing',
];

/**
 * Status values that indicate the post is in a terminal state
 */
export const TERMINAL_STATUSES: PostStatus[] = [
  'published',
  'failed',
  'rejected',
  'archived',
  'partial',
];

/**
 * Status configuration with labels and styling
 */
export interface StatusConfig {
  label: string;
  shortLabel: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  icon: 'file' | 'clock' | 'check' | 'x' | 'alert' | 'loader' | 'archive' | 'partial';
}

export const STATUS_CONFIG: Record<PostStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    shortLabel: 'Draft',
    description: 'Not yet ready for review or publishing',
    color: {
      bg: 'bg-secondary-100',
      text: 'text-secondary-700',
      border: 'border-secondary-200',
    },
    icon: 'file',
  },
  pending_approval: {
    label: 'Pending Approval',
    shortLabel: 'Pending',
    description: 'Waiting for review and approval',
    color: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    icon: 'clock',
  },
  approved: {
    label: 'Approved',
    shortLabel: 'Approved',
    description: 'Approved and ready to schedule or publish',
    color: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    icon: 'check',
  },
  rejected: {
    label: 'Rejected',
    shortLabel: 'Rejected',
    description: 'Rejected and returned for revision',
    color: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    icon: 'x',
  },
  scheduled: {
    label: 'Scheduled',
    shortLabel: 'Scheduled',
    description: 'Scheduled for future publishing',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    icon: 'clock',
  },
  publishing: {
    label: 'Publishing',
    shortLabel: 'Publishing',
    description: 'Currently being published to platforms',
    color: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
    },
    icon: 'loader',
  },
  published: {
    label: 'Published',
    shortLabel: 'Published',
    description: 'Successfully published to all platforms',
    color: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    icon: 'check',
  },
  partial: {
    label: 'Partial',
    shortLabel: 'Partial',
    description: 'Published to some platforms, failed on others',
    color: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
    },
    icon: 'partial',
  },
  failed: {
    label: 'Failed',
    shortLabel: 'Failed',
    description: 'Failed to publish to all platforms',
    color: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    icon: 'alert',
  },
  archived: {
    label: 'Archived',
    shortLabel: 'Archived',
    description: 'Removed from active view',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      border: 'border-gray-200',
    },
    icon: 'archive',
  },
};

/**
 * Get status configuration with fallback for unknown statuses
 */
export function getStatusConfig(status: string): StatusConfig {
  if (status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as PostStatus];
  }
  
  // Fallback for unknown status
  return {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    shortLabel: status.slice(0, 10),
    description: 'Unknown status',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200',
    },
    icon: 'file',
  };
}

/**
 * Get CSS classes for status badge styling
 */
export function getStatusBadgeClasses(status: string): string {
  const config = getStatusConfig(status);
  return `${config.color.bg} ${config.color.text}`;
}

/**
 * Get CSS classes for status card/border styling
 */
export function getStatusCardClasses(status: string): string {
  const config = getStatusConfig(status);
  return `${config.color.bg} ${config.color.border} ${config.color.text}`;
}

/**
 * Check if a status allows editing
 */
export function isEditableStatus(status: string): boolean {
  return ['draft', 'rejected', 'pending_approval'].includes(status);
}

/**
 * Check if a status allows deletion
 */
export function isDeletableStatus(status: string): boolean {
  return ['draft', 'rejected', 'scheduled', 'failed'].includes(status);
}

/**
 * Check if a status indicates the post can be published
 */
export function isPublishableStatus(status: string): boolean {
  return ['draft', 'approved', 'scheduled'].includes(status);
}

/**
 * Check if status is valid
 */
export function isValidStatus(status: string): status is PostStatus {
  return POST_STATUSES.includes(status as PostStatus);
}

/**
 * Zod-compatible status enum values for API validation
 */
export const STATUS_ENUM_VALUES = POST_STATUSES;

