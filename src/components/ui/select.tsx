'use client';

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Context for Select component
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

// Main Select component (for the old API)
interface SelectPropsOld extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

// New Select component (shadcn/ui-style)
interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children?: React.ReactNode;
  options?: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps | SelectPropsOld> = (props) => {
  // Check if using old API (has options prop)
  if ('options' in props && props.options) {
    return <SelectOld {...props as SelectPropsOld} />;
  }
  
  // New API
  const { value, onValueChange, defaultValue, children } = props as SelectProps;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

// Old API Select component
const SelectOld = React.forwardRef<HTMLDivElement, SelectPropsOld>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select an option",
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const selectRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open]);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setOpen(false);
    };

    return (
      <div ref={selectRef} className={cn("relative", className)} {...props}>
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-secondary-300 bg-white px-4 py-2 text-left text-sm",
            "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500",
            "hover:bg-secondary-50",
            open && "border-primary-500 ring-2 ring-primary-500"
          )}
        >
          <span className={cn(!selectedOption && "text-secondary-500")}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform text-secondary-500",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-secondary-300 bg-white shadow-lg">
            <div className="max-h-60 overflow-auto p-1">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-secondary-500">
                  No options found
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                      "hover:bg-primary-50 focus:bg-primary-50 focus:outline-none",
                      "disabled:cursor-not-allowed disabled:text-secondary-400",
                      option.value === value && "bg-primary-100 text-primary-900"
                    )}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  
  return <span>{value || placeholder}</span>;
};

const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const { open, setOpen } = React.useContext(SelectContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg",
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  );
};

const SelectItem: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value: itemValue, children, className }) => {
  const { value, onValueChange } = React.useContext(SelectContext);
  const isSelected = value === itemValue;

  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-secondary-100 focus:bg-secondary-100",
        isSelected && "bg-secondary-100",
        className
      )}
      onClick={() => onValueChange?.(itemValue)}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  );
};

Select.displayName = "Select";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
export type { SelectOption };

