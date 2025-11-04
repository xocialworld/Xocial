'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last year', days: 365 },
  ];

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({ from, to });
    setShowCustom(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Period:</span>
      </div>
      
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
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
          <span className="text-gray-500">to</span>
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

