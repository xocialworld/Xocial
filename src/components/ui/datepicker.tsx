'use client';

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      placeholder = "Select a date",
      minDate,
      maxDate,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [currentMonth, setCurrentMonth] = React.useState(value || new Date());
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const handleDateSelect = (date: Date) => {
      if (disabled) return;
      
      if (minDate && date < minDate) return;
      if (maxDate && date > maxDate) return;

      onChange?.(date);
      setIsOpen(false);
    };

    const handlePrevMonth = () => {
      setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(addMonths(currentMonth, 1));
    };

    const isDateDisabled = (date: Date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    return (
      <div ref={pickerRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-secondary-300 bg-white px-4 py-2 text-left text-sm",
            "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500",
            "hover:bg-secondary-50"
          )}
        >
          <span className={cn(!value && "text-secondary-500")}>
            {value ? format(value, "MMM dd, yyyy") : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-secondary-500" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-72 rounded-lg border border-secondary-300 bg-white p-4 shadow-lg">
            {/* Month Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1 hover:bg-secondary-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-sm font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1 hover:bg-secondary-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-secondary-600">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = value && isSameDay(day, value);
                const isDisabled = isDateDisabled(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled || !isCurrentMonth}
                    className={cn(
                      "h-8 w-8 rounded-md text-xs transition-colors",
                      "hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500",
                      !isCurrentMonth && "text-secondary-300",
                      isCurrentMonth && !isSelected && "text-secondary-900",
                      isSelected && "bg-primary-600 text-white hover:bg-primary-700",
                      isToday && !isSelected && "border border-primary-600",
                      isDisabled && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

