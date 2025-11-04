'use client';

import { useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export function MediaUploader({ files, onChange, maxFiles = 10 }: MediaUploaderProps) {
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    onChange(newFiles);
  }, [files, maxFiles, onChange]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
    onChange(newFiles);
  }, [files, maxFiles, onChange]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="w-6 h-6" />;
    }
    return <Upload className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
      >
        <input
          type="file"
          id="media-upload"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <label htmlFor="media-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-gray-500">
            Images or videos (max {maxFiles} files)
          </p>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-1 gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 text-gray-600">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

