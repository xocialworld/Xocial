import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={`flex h-full min-h-[200px] w-full flex-col items-center justify-center rounded-lg border border-error-200 bg-error-50 p-6 text-center ${className || ""}`}>
      <AlertTriangle className="mb-4 h-10 w-10 text-error-500" />
      <h3 className="mb-2 text-lg font-semibold text-secondary-900">
        {title}
      </h3>
      <p className="mb-6 text-sm text-secondary-600">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 border-error-200 bg-white text-error-700 hover:bg-error-50 hover:text-error-800"
        >
          <RefreshCw className="h-3 w-3" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-error-600 ${className || ""}`}>
      <AlertTriangle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
