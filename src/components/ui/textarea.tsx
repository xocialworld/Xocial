'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm",
            "placeholder:text-secondary-500",
            "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500",
            "resize-y",
            error && "border-error-500 focus:border-error-500 focus:ring-error-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-secondary-500">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export { TextArea };
export { TextArea as Textarea };

