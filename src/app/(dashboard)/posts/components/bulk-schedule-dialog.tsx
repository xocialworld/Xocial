'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const bulkScheduleSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  interval: z.enum(['15min', '30min', '1hour', '2hours', '1day', 'custom']),
  customInterval: z.string().optional(),
});

type BulkScheduleFormData = z.infer<typeof bulkScheduleSchema>;

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postCount: number;
  onSchedule: (schedules: Date[]) => Promise<void>;
}

export function BulkScheduleDialog({
  open,
  onOpenChange,
  postCount,
  onSchedule,
}: BulkScheduleDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BulkScheduleFormData>({
    resolver: zodResolver(bulkScheduleSchema),
    defaultValues: {
      interval: '1hour',
    },
  });

  const interval = watch('interval');

  const generateSchedules = (data: BulkScheduleFormData): Date[] => {
    const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
    const schedules: Date[] = [startDateTime];

    // Calculate interval in minutes
    let intervalMinutes = 60; // default 1 hour
    switch (data.interval) {
      case '15min':
        intervalMinutes = 15;
        break;
      case '30min':
        intervalMinutes = 30;
        break;
      case '1hour':
        intervalMinutes = 60;
        break;
      case '2hours':
        intervalMinutes = 120;
        break;
      case '1day':
        intervalMinutes = 1440;
        break;
      case 'custom':
        intervalMinutes = parseInt(data.customInterval || '60');
        break;
    }

    // Generate subsequent schedules
    for (let i = 1; i < postCount; i++) {
      const nextDate = new Date(schedules[i - 1]);
      nextDate.setMinutes(nextDate.getMinutes() + intervalMinutes);
      schedules.push(nextDate);
    }

    return schedules;
  };

  const onSubmit = async (data: BulkScheduleFormData) => {
    try {
      setLoading(true);
      const schedules = generateSchedules(data);
      await onSchedule(schedules);
      toast.success(`Scheduled ${postCount} posts`);
      onOpenChange(false);
    } catch (error) {
      console.error('Bulk schedule error:', error);
      toast.error('Failed to schedule posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Schedule Posts</DialogTitle>
          <DialogDescription>
            Schedule {postCount} posts with automatic time intervals
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('startDate')}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">
              Start Time <span className="text-destructive">*</span>
            </Label>
            <Input id="startTime" type="time" {...register('startTime')} />
            {errors.startTime && (
              <p className="text-sm text-destructive">{errors.startTime.message}</p>
            )}
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">
              Time Interval <span className="text-destructive">*</span>
            </Label>
            <Select value={interval} onValueChange={(value) => setValue('interval', value as any)}>
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15min">Every 15 minutes</SelectItem>
                <SelectItem value="30min">Every 30 minutes</SelectItem>
                <SelectItem value="1hour">Every hour</SelectItem>
                <SelectItem value="2hours">Every 2 hours</SelectItem>
                <SelectItem value="1day">Every day</SelectItem>
                <SelectItem value="custom">Custom interval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Interval */}
          {interval === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customInterval">
                Custom Interval (minutes)
              </Label>
              <Input
                id="customInterval"
                type="number"
                min="1"
                placeholder="e.g., 90"
                {...register('customInterval')}
              />
            </div>
          )}

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Schedule Preview:</p>
            <p className="text-sm text-muted-foreground">
              {postCount} posts will be scheduled starting from your selected date and time,
              with the specified interval between each post.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule Posts
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

