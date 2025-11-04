'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Archive, Send, Calendar, X, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkArchive: () => Promise<void>;
  onBulkPublish: () => Promise<void>;
  onBulkSchedule: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkArchive,
  onBulkPublish,
  onBulkSchedule,
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await onBulkDelete();
      setShowDeleteDialog(false);
      toast.success(`Deleted ${selectedCount} post(s)`);
    } catch (error) {
      toast.error('Failed to delete posts');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    try {
      setLoading(true);
      await onBulkArchive();
      toast.success(`Archived ${selectedCount} post(s)`);
    } catch (error) {
      toast.error('Failed to archive posts');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    try {
      setLoading(true);
      await onBulkPublish();
      toast.success(`Published ${selectedCount} post(s)`);
    } catch (error) {
      toast.error('Failed to publish posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base py-1 px-3">
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkPublish}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onBulkSchedule}
                disabled={loading}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkArchive}
                disabled={loading}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={loading}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBulkPublish}>
                    <Send className="h-4 w-4 mr-2" />
                    Publish All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onBulkSchedule}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} post(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected posts
              from all platforms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

