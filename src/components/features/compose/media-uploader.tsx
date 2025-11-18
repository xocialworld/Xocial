'use client';

import { useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Video, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSelectedWorkspace } from '@/store/workspaceStore';

export type ComposerMedia = {
  clientId: string;
  id?: string;
  url?: string;
  previewUrl: string;
  type: 'image' | 'video';
  filename: string;
  size: number;
  thumbnail_url?: string | null;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
};

interface MediaUploaderProps {
  items: ComposerMedia[];
  onChange: React.Dispatch<React.SetStateAction<ComposerMedia[]>>;
  maxFiles?: number;
}

const bytesToSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createPreviewUrl = (file: File) => URL.createObjectURL(file);

export function MediaUploader({ items, onChange, maxFiles = 10 }: MediaUploaderProps) {
  const activeCount = items.filter((item) => item.status !== 'error').length;
  const canAddMore = activeCount < maxFiles;
  const selectedWorkspace = useSelectedWorkspace();
  const activeWorkspaceId = selectedWorkspace?.id;

  const removeById = useCallback(
    (clientId: string) => {
      onChange((prev) => {
        const target = prev.find((item) => item.clientId === clientId);
        if (target && target.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return prev.filter((item) => item.clientId !== clientId);
      });
    },
    [onChange]
  );

  const updateById = useCallback(
    (clientId: string, patch: Partial<ComposerMedia>) => {
      onChange((prev) =>
        prev.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item))
      );
    },
    [onChange]
  );

  const startUpload = useCallback(
    async (file: File) => {
      const previewUrl = createPreviewUrl(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const clientId = crypto.randomUUID();

      onChange((prev) => [
        ...prev,
        {
          clientId,
          previewUrl,
          type,
          filename: file.name,
          size: file.size,
          status: 'uploading',
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const workspaceQuery = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : '';
        const response = await fetch(`/api/media/upload${workspaceQuery}`, {
          method: 'POST',
          body: formData,
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Upload failed');
        }

        const record = payload.data;
        if (previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }

        updateById(clientId, {
          id: record.id,
          url: record.url,
          thumbnail_url: record.thumbnail_url,
          status: 'uploaded',
          previewUrl: record.url,
          type: record.file_type === 'video' ? 'video' : 'image',
        });
      } catch (error) {
        console.error('Upload error', error);
        updateById(clientId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    },
    [activeWorkspaceId, onChange, updateById]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      if (!selectedFiles.length) return;

      const availableSlots = maxFiles - activeCount;
      selectedFiles.slice(0, availableSlots).forEach((file) => startUpload(file));
      event.target.value = '';
    },
    [activeCount, maxFiles, startUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!canAddMore) return;
      const droppedFiles = Array.from(event.dataTransfer.files);
      const availableSlots = maxFiles - activeCount;
      droppedFiles.slice(0, availableSlots).forEach((file) => startUpload(file));
    },
    [activeCount, canAddMore, maxFiles, startUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          canAddMore
            ? 'border-gray-300 hover:border-gray-400 cursor-pointer'
            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          id="media-upload"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={!canAddMore}
        />
        <label htmlFor="media-upload" className={canAddMore ? 'cursor-pointer' : 'cursor-not-allowed'}>
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">
            {canAddMore ? 'Click to upload or drag and drop' : 'Maximum attachments reached'}
          </p>
          <p className="text-sm text-gray-500">
            Images or videos (max {maxFiles} files)
          </p>
        </label>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Attachments ({items.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {items.map((item) => (
              <div
                key={item.clientId}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 text-gray-600">
                  {item.type === 'image' ? <ImageIcon className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {bytesToSize(item.size)}
                  </p>
                  {item.status === 'uploading' && (
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Uploading...
                    </p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">
                      {item.error || 'Upload failed'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeById(item.clientId)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

