"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

interface MultiSelectProps {
    label?: string;
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    label,
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleRemove = (value: string) => {
        onChange(selected.filter((item) => item !== value));
    };

    const selectedOptions = options.filter((option) =>
        selected.includes(option.value)
    );

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {label && (
                <label className="text-sm font-medium text-muted-foreground">
                    {label}
                </label>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="justify-between min-w-[200px]"
                    >
                        <span className="truncate">
                            {selected.length === 0
                                ? placeholder
                                : `${selected.length} selected`}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                    <div className="max-h-64 overflow-auto p-2">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm",
                                    selected.includes(option.value) && "bg-accent"
                                )}
                            >
                                <Check
                                    className={cn(
                                        "h-4 w-4",
                                        selected.includes(option.value)
                                            ? "opacity-100"
                                            : "opacity-0"
                                    )}
                                />
                                {option.icon && <span>{option.icon}</span>}
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Selected items as badges */}
            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedOptions.map((option) => (
                        <Badge
                            key={option.value}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {option.icon && <span className="text-xs">{option.icon}</span>}
                            <span>{option.label}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(option.value)}
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
