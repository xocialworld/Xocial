/**
 * Media Library Page
 * Manage all uploaded media files
 */

'use client';
/* eslint-disable @next/next/no-img-element -- Media thumbnails render arbitrary user uploads that require raw <img> tags for flexibility */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Search,
  Trash2,
  Eye,
  Download,
  Filter,
  Grid3x3,
  List,
  CheckSquare,
  X,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaGridSkeleton } from '@/components/ui/skeleton-variants';
import { MediaDetailsDrawer } from '@/components/media/media-details-drawer';
import { MediaUploadModal } from '@/components/media/media-upload-modal';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useSelectedWorkspace } from '@/store/workspaceStore';

interface MediaFile {
  id: string;
  filename: string;
  original_filename?: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  width?: number | null;
  height?: number | null;
  created_at: string;
  ai_labels: string[] | null;
  ai_description: string | null;
}

/**
 * Fetch media files
 */
type MediaFilterType = 'all' | 'image' | 'video';

interface MediaQueryOptions {
  search?: string;
  type?: MediaFilterType;
  label?: string;
  workspaceId?: string;
}

async function fetchMedia(options: MediaQueryOptions) {
  const params = new URLSearchParams();
  if (options.search) params.append('search', options.search);
  if (options.type && options.type !== 'all') params.append('type', options.type);
  if (options.label) params.append('label', options.label);
  if (options.workspaceId) params.append('workspaceId', options.workspaceId);

  const query = params.toString();
  const response = await fetch(`/api/media${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch media');
  return response.json();
}

/**
 * Delete media file
 */
async function deleteMedia(id: string, workspaceId?: string) {
  const response = await fetch(
    `/api/media/${id}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`,
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) throw new Error('Failed to delete media');
  return response.json();
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<MediaFilterType>('all');
  const [labelFilter, setLabelFilter] = useState('');

  // Modal and drawer state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const selectedWorkspace = useSelectedWorkspace();
  const activeWorkspaceId = selectedWorkspace?.id;

  // Fetch media
  const { data, isLoading } = useQuery({
    queryKey: ['media', searchQuery, typeFilter, labelFilter, activeWorkspaceId],
    queryFn: () =>
      fetchMedia({
        search: searchQuery,
        type: typeFilter,
        label: labelFilter,
        workspaceId: activeWorkspaceId,
      }),
  });

  const mediaFiles: MediaFile[] = data?.data?.media || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id, activeWorkspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete media');
    },
  });

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    if (selectedFiles.size === mediaFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(mediaFiles.map((f: MediaFile) => f.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;

    if (confirm(`Delete ${selectedFiles.size} file(s)?`)) {
      selectedFiles.forEach((id) => deleteMutation.mutate(id));
      setSelectedFiles(new Set());
    }
  };

  const handlePreview = (file: MediaFile) => {
    window.open(file.url, '_blank', 'noopener');
  };

  const handleDownloadSingle = (file: MediaFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.filename || 'media';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Media Library</h1>
            <p className="mt-2 text-secondary-600">
              Manage all your images and videos in one place
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-5 w-5" />
            Upload Media
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[260px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type filter */}
          <div className="w-[140px]">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MediaFilterType)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Label filter */}
          <div className="relative flex-1 min-w-[180px]">
            <Input
              placeholder="Filter by label"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="pr-10"
            />
            {labelFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setLabelFilter('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 border border-gray-200 rounded-md p-1">
          <Button
            variant={view === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Bulk actions */}
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary">
              {selectedFiles.size} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Selection toolbar */}
      {mediaFiles.length > 0 && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            <CheckSquare className="mr-2 h-4 w-4" />
            {selectedFiles.size === mediaFiles.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      )}

      {/* Media Grid/List */}
      {isLoading ? (
        <MediaGridSkeleton count={12} />
      ) : mediaFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-4">
            {searchQuery ? 'No media found' : 'No media uploaded yet'}
          </p>
          <Button>
            <Upload className="mr-2 h-5 w-5" />
            Upload Your First Media
          </Button>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {mediaFiles.map((file: MediaFile) => (
            <div key={file.id} className="group relative aspect-square">
              <Card className="h-full overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                {/* Selection checkbox */}
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id);
                  }}
                >
                  <div
                    className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-colors ${selectedFiles.has(file.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'bg-white border-gray-300'
                      }`}
                  >
                    {selectedFiles.has(file.id) && (
                      <CheckSquare className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Image */}
                <img
                  src={file.thumbnail_url || file.url}
                  alt={file.filename}
                  className="w-full h-full object-cover"
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(file);
                      setShowDetailsDrawer(true);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(file);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle(file);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this media?')) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* File info */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent space-y-1">
                  <div>
                    <p className="text-xs text-white truncate">{file.filename}</p>
                    <p className="text-xs text-white/80">{formatFileSize(file.file_size)}</p>
                  </div>
                  {file.ai_labels && file.ai_labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.ai_labels.slice(0, 2).map((label) => (
                        <span
                          key={label}
                          className="text-[10px] uppercase tracking-wide bg-white/20 text-white px-1.5 py-0.5 rounded"
                        >
                          {label}
                        </span>
                      ))}
                      {file.ai_labels.length > 2 && (
                        <span className="text-[10px] text-white/80">
                          +{file.ai_labels.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {mediaFiles.map((file: MediaFile) => (
              <div
                key={file.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                {/* Checkbox */}
                <div
                  onClick={() => toggleFileSelection(file.id)}
                  className="cursor-pointer"
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center ${selectedFiles.has(file.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300'
                      }`}
                  >
                    {selectedFiles.has(file.id) && (
                      <CheckSquare className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={file.thumbnail_url || file.url}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-secondary-900 truncate">{file.filename}</p>
                  <p className="text-sm text-secondary-600">
                    {formatFileSize(file.file_size)} • {file.mime_type}
                  </p>
                  <p className="text-xs text-secondary-500">
                    Uploaded {formatDistanceToNow(new Date(file.created_at))} ago
                  </p>
                  {file.ai_labels && file.ai_labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {file.ai_labels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-[11px]">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(file)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadSingle(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this media?')) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-error-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['media'] });
          setShowUploadModal(false);
        }}
        workspaceId={activeWorkspaceId}
      />

      {/* Details Drawer */}
      <MediaDetailsDrawer
        media={selectedMedia}
        isOpen={showDetailsDrawer}
        onClose={() => {
          setShowDetailsDrawer(false);
          setSelectedMedia(null);
        }}
        onDelete={(id) => {
          deleteMutation.mutate(id);
          setShowDetailsDrawer(false);
          setSelectedMedia(null);
        }}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

