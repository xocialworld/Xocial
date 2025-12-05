"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 rounded-full bg-error-50 p-4">
        <AlertTriangle className="h-12 w-12 text-error-600" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-secondary-900">
        Something went wrong in the dashboard
      </h2>
      <p className="mb-8 max-w-md text-secondary-600">
        We couldn&apos;t load this section. This might be a temporary issue with your connection or our servers.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-8 w-full max-w-lg rounded-lg border border-error-200 bg-error-50 p-4 text-left overflow-auto max-h-48">
          <p className="font-mono text-xs text-error-700 whitespace-pre-wrap">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </p>
        </div>
      )}

      <Button onClick={reset} size="lg" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
