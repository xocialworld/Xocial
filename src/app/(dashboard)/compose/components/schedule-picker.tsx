'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { X, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface SchedulePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value);
  const [selectedTime, setSelectedTime] = useState(
    value ? format(value, 'HH:mm') : '12:00'
  );

  const handleApply = () => {
    if (selectedDate) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(hours, minutes, 0, 0);
      onChange(scheduledDate);
      setShowPicker(false);
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    setSelectedTime('12:00');
    onChange(null);
    setShowPicker(false);
  };

  if (!showPicker && !value) {
    return (
      <Button
        variant="secondary"
        onClick={() => setShowPicker(true)}
        className="w-full"
      >
        <Clock className="w-4 h-4 mr-2" />
        Schedule for later
      </Button>
    );
  }

  if (!showPicker && value) {
    return (
      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Calendar className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Scheduled for
          </p>
          <p className="text-sm text-blue-700">
            {format(value, 'MMM d, yyyy')} at {format(value, 'h:mm a')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(true)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <DatePicker
          value={selectedDate || undefined}
          onChange={(date) => setSelectedDate(date || null)}
          placeholder="Select date"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time
        </label>
        <input
          type="time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={handleClear}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          disabled={!selectedDate}
          className="flex-1"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

