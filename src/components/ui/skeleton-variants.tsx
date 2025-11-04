/**
 * Skeleton Loading Variants
 * Skeleton components for different UI elements
 * Based on SRS Section 4.4
 */

import { Skeleton } from './skeleton';
import { Card } from './card';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// POST CARD SKELETON
// ═══════════════════════════════════════════════════════════════

export function PostCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Image */}
      <Skeleton className="h-48 w-full rounded-md mb-4" />

      {/* Footer */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );
}

/**
 * Grid of post card skeletons
 */
export function PostCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT CARD SKELETON
// ═══════════════════════════════════════════════════════════════

export function AccountCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      {/* Platform icon and badge */}
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Account name */}
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div>
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div>
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </Card>
  );
}

/**
 * Grid of account card skeletons
 */
export function AccountCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <AccountCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TABLE SKELETON
// ═══════════════════════════════════════════════════════════════

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {/* Table header */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 w-24" />
          ))}
        </div>
      </div>

      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-10 w-full"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART SKELETON
// ═══════════════════════════════════════════════════════════════

export function ChartSkeleton({
  height = 300,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <Card className={cn('p-6', className)}>
      {/* Chart title */}
      <Skeleton className="h-6 w-48 mb-6" />

      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between w-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`y-${i}`} className="h-3 w-8" />
          ))}
        </div>

        {/* Chart bars/lines */}
        <div className="ml-14 h-full flex items-end justify-between gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={`bar-${i}`}
              className="flex-1"
              style={{ height: `${Math.random() * 70 + 30}%` }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="ml-14 mt-3 flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`x-${i}`} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// METRIC CARD SKELETON
// ═══════════════════════════════════════════════════════════════

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-20" />
    </Card>
  );
}

/**
 * Grid of metric card skeletons
 */
export function MetricCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE SKELETON
// ═══════════════════════════════════════════════════════════════

export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIST ITEM SKELETON
// ═══════════════════════════════════════════════════════════════

export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)}>
      <Skeleton className="h-10 w-10 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * List of skeleton items
 */
export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR SKELETON
// ═══════════════════════════════════════════════════════════════

export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`day-header-${i}`} className="h-6 w-full" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton
            key={`day-${i}`}
            className="h-24 w-full"
            style={{ opacity: Math.random() * 0.5 + 0.5 }}
          />
        ))}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CARD SKELETON
// ═══════════════════════════════════════════════════════════════

export function TemplateCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-4', className)}>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-full mb-4" />
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </Card>
  );
}

/**
 * Grid of template card skeletons
 */
export function TemplateCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TemplateCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEDIA GRID SKELETON
// ═══════════════════════════════════════════════════════════════

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM SKELETON
// ═══════════════════════════════════════════════════════════════

export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD SKELETON
// ═══════════════════════════════════════════════════════════════

export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Metrics */}
      <MetricCardSkeletonGrid count={4} />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <TableSkeleton rows={5} columns={4} />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMENT SKELETON
// ═══════════════════════════════════════════════════════════════

export function CommentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 p-4', className)}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-4 mt-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * List of comment skeletons
 */
export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE HEADER SKELETON
// ═══════════════════════════════════════════════════════════════

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STRATEGY RECOMMENDATION SKELETON
// ═══════════════════════════════════════════════════════════════

export function RecommendationCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      
      <Skeleton className="h-9 w-28" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const SkeletonVariants = {
  PostCard: PostCardSkeleton,
  PostCardGrid: PostCardSkeletonGrid,
  AccountCard: AccountCardSkeleton,
  AccountCardGrid: AccountCardSkeletonGrid,
  Table: TableSkeleton,
  Chart: ChartSkeleton,
  MetricCard: MetricCardSkeleton,
  MetricCardGrid: MetricCardSkeletonGrid,
  Profile: ProfileSkeleton,
  ListItem: ListItemSkeleton,
  List: ListSkeleton,
  Calendar: CalendarSkeleton,
  TemplateCard: TemplateCardSkeleton,
  TemplateCardGrid: TemplateCardSkeletonGrid,
  MediaGrid: MediaGridSkeleton,
  Form: FormSkeleton,
  Dashboard: DashboardSkeleton,
  Comment: CommentSkeleton,
  CommentList: CommentListSkeleton,
  PageHeader: PageHeaderSkeleton,
  RecommendationCard: RecommendationCardSkeleton,
};

export default SkeletonVariants;

