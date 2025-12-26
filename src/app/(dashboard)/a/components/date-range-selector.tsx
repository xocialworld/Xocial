'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presets = useMemo(() => [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last year', days: 365 },
  ], []);

  const activePreset = useMemo(() => {
    const diffInDays = Math.round(
      (value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    return presets.find((preset) => Math.abs(diffInDays - preset.days) <= 1);
  }, [presets, value.from, value.to]);

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    onChange({ from, to });
    setShowCustom(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-secondary-500" />
        <span className="text-sm font-medium text-secondary-700">Period:</span>
      </div>

      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={activePreset?.label === preset.label ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handlePreset(preset.days)}
        >
          {preset.label}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustom(!showCustom)}
      >
        Custom Range
      </Button>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <DatePicker
            value={value.from}
            onChange={(date) => date && onChange({ ...value, from: date })}
            placeholder="From"
          />
          <span className="text-secondary-500">to</span>
          <DatePicker
            value={value.to}
            onChange={(date) => date && onChange({ ...value, to: date })}
            placeholder="To"
          />
        </div>
      )}
    </div>
  );
}

