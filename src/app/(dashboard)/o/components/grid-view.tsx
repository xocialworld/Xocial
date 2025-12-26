"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Grid3X3, 
  Calendar as CalendarIcon, 
  Filter,
  Eye,
  EyeOff,
  ArrowUpDown,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Film,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Calendar post type
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  media?: unknown[];
  _source?: string;
  _calendarDate?: string;
  _title?: string;
  _postType?: string;
  _permalink?: string;
  _metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

interface GridViewProps {
  posts: CalendarPost[];
  onPostClick: (post: CalendarPost) => void;
  selectedPlatform?: string;
  onPlatformChange?: (platform: string) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'engagement' | 'status';
type GridSize = 3 | 4 | 5 | 6;

/**
 * Instagram-style Grid View for visual feed planning.
 * Shows posts in a grid layout optimized for visual content planning.
 */
export function GridView({
  posts,
  onPostClick,
  selectedPlatform = 'instagram',
  onPlatformChange,
}: GridViewProps) {
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showOnlyWithMedia, setShowOnlyWithMedia] = useState(false);
  const [showExternal, setShowExternal] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  // Filter posts by selected platform
  const platformPosts = useMemo(() => {
    let filtered = posts.filter((post) => {
      const platforms = post.platforms || [];
      // Show posts that include the selected platform or are generic
      return platforms.includes(selectedPlatform) || platforms.length === 0;
    });

    // Filter by source if needed
    if (!showExternal) {
      filtered = filtered.filter((post) => post._source !== 'external');
    }

    // Filter by media if needed
    if (showOnlyWithMedia) {
      filtered = filtered.filter((post) => {
        const media = post.media as unknown[];
        return media && media.length > 0;
      });
    }

    return filtered;
  }, [posts, selectedPlatform, showExternal, showOnlyWithMedia]);

  // Sort posts
  const sortedPosts = useMemo(() => {
    const sorted = [...platformPosts];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a._calendarDate || a.scheduled_at || a.published_at || a.created_at || 0);
          const dateB = new Date(b._calendarDate || b.scheduled_at || b.published_at || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a._calendarDate || a.scheduled_at || a.published_at || a.created_at || 0);
          const dateB = new Date(b._calendarDate || b.scheduled_at || b.published_at || b.created_at || 0);
          return dateA.getTime() - dateB.getTime();
        });
      case 'engagement':
        return sorted.sort((a, b) => {
          const engA = (a._metrics?.likes as number || 0) + (a._metrics?.comments as number || 0);
          const engB = (b._metrics?.likes as number || 0) + (b._metrics?.comments as number || 0);
          return engB - engA;
        });
      case 'status':
        const statusOrder: Record<string, number> = {
          scheduled: 1,
          approved: 2,
          in_review: 3,
          draft: 4,
          published: 5,
          failed: 6,
        };
        return sorted.sort((a, b) => {
          return (statusOrder[a.status] || 10) - (statusOrder[b.status] || 10);
        });
      default:
        return sorted;
    }
  }, [platformPosts, sortBy]);

  // Get thumbnail for a post
  const getThumbnail = (post: CalendarPost): string | null => {
    const media = post.media as any[];
    if (!media || media.length === 0) return null;
    
    const firstMedia = media[0];
    return firstMedia?.thumbnail || firstMedia?.url || firstMedia?.preview_image_url || null;
  };

  // Get post type icon
  const getPostTypeIcon = (post: CalendarPost) => {
    const postType = post._postType?.toLowerCase();
    if (postType === 'video' || postType === 'reel' || postType === 'short') {
      return <Film className="h-3 w-3" />;
    }
    if (postType === 'carousel_album' || postType === 'carousel') {
      return <Grid3X3 className="h-3 w-3" />;
    }
    return <ImageIcon className="h-3 w-3" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'approved': return 'bg-emerald-500';
      case 'in_review': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-400';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Get caption preview
  const getCaptionPreview = (post: CalendarPost): string => {
    const content = post.content as Record<string, unknown>;
    if (!content) return '';
    
    const text = content.text || content.caption || content.message || content.title || '';
    const caption = String(text);
    return caption.length > 100 ? caption.slice(0, 100) + '...' : caption;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-secondary-200 bg-secondary-50/50">
        <div className="flex items-center gap-3">
          {/* Platform selector */}
          <Select
            value={selectedPlatform}
            onValueChange={(value) => onPlatformChange?.(value)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="instagram" className="h-4 w-4" />
                  Instagram
                </div>
              </SelectItem>
              <SelectItem value="facebook">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="facebook" className="h-4 w-4" />
                  Facebook
                </div>
              </SelectItem>
              <SelectItem value="twitter">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="twitter" className="h-4 w-4" />
                  Twitter
                </div>
              </SelectItem>
              <SelectItem value="tiktok">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="tiktok" className="h-4 w-4" />
                  TikTok
                </div>
              </SelectItem>
              <SelectItem value="youtube">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="youtube" className="h-4 w-4" />
                  YouTube
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Grid size */}
          <div className="flex items-center gap-1 bg-white rounded-md border border-secondary-200 p-0.5">
            {([3, 4, 5, 6] as GridSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors",
                  gridSize === size
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-600 hover:bg-secondary-100"
                )}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowOnlyWithMedia(!showOnlyWithMedia)}>
                {showOnlyWithMedia ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {showOnlyWithMedia ? 'All posts' : 'With media only'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowExternal(!showExternal)}>
                <Globe className="h-4 w-4 mr-2" />
                {showExternal ? 'Hide imported' : 'Show imported'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('date-desc')}>
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('date-asc')}>
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('engagement')}>
                By engagement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('status')}>
                By status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-secondary-50/30 border-b border-secondary-100 flex items-center gap-4 text-xs text-secondary-600">
        <span>{sortedPosts.length} posts</span>
        <span>•</span>
        <span>{sortedPosts.filter(p => p.status === 'scheduled').length} scheduled</span>
        <span>•</span>
        <span>{sortedPosts.filter(p => p.status === 'published').length} published</span>
        <span>•</span>
        <span>{sortedPosts.filter(p => p._source === 'external').length} imported</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary-500">
            <Grid3X3 className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No posts found</p>
            <p className="text-sm text-secondary-400 mt-1">
              Connect a {selectedPlatform} account and sync posts to see them here
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {sortedPosts.map((post) => {
              const thumbnail = getThumbnail(post);
              const isHovered = hoveredPost === post.id;
              const isExternal = post._source === 'external';
              const date = post._calendarDate || post.scheduled_at || post.published_at || post.created_at;

              return (
                <div
                  key={post.id}
                  onClick={() => onPostClick(post)}
                  onMouseEnter={() => setHoveredPost(post.id)}
                  onMouseLeave={() => setHoveredPost(null)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all",
                    "border border-secondary-200 hover:border-primary-400 hover:shadow-lg hover:z-10",
                    isExternal && "ring-1 ring-secondary-300"
                  )}
                >
                  {/* Background / Thumbnail */}
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center">
                      <div className="text-secondary-400 text-center p-2">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                        <span className="text-xs line-clamp-2">{getCaptionPreview(post) || 'No media'}</span>
                      </div>
                    </div>
                  )}

                  {/* Status indicator */}
                  <div
                    className={cn(
                      "absolute top-2 left-2 h-2 w-2 rounded-full",
                      getStatusColor(post.status)
                    )}
                  />

                  {/* Post type badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {isExternal && (
                      <div className="bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                      </div>
                    )}
                    <div className="bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1">
                      {getPostTypeIcon(post)}
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/70 flex flex-col justify-end p-3 transition-opacity",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {/* Caption preview */}
                    <p className="text-white text-xs line-clamp-3 mb-2">
                      {getCaptionPreview(post) || 'No caption'}
                    </p>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-white/80 text-[10px]">
                      <span>{date ? format(new Date(date), 'MMM d, yyyy') : 'No date'}</span>
                      <div className="flex items-center gap-2">
                        {typeof post._metrics?.likes === 'number' && post._metrics.likes > 0 && (
                          <span>❤️ {post._metrics.likes}</span>
                        )}
                        {typeof post._metrics?.comments === 'number' && post._metrics.comments > 0 && (
                          <span>💬 {post._metrics.comments}</span>
                        )}
                      </div>
                    </div>

                    {/* External link for published posts */}
                    {post._permalink && (
                      <a
                        href={post._permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-3 text-white hover:text-primary-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Video play icon */}
                  {(post._postType === 'video' || post._postType === 'reel' || post._postType === 'short') && !isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/40 rounded-full p-2">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

