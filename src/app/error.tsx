"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-error-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-error-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-secondary-900 mb-4">
          Something Went Wrong
        </h1>
        <p className="text-lg text-secondary-600 mb-8">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-error-700 font-mono">
            {error.message || "An unknown error occurred"}
          </p>
        </div>
        <Button onClick={reset} size="lg">
          <RefreshCw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

