"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 sm:p-8 text-center">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg mx-auto">
        {/* Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-error-200/50 blur-2xl rounded-full" />
          <div className="relative mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-error-500 to-error-600 flex items-center justify-center shadow-lg shadow-error-500/30">
            <AlertTriangle className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-secondary-900">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="mb-8 text-secondary-600 leading-relaxed">
          We couldn&apos;t load this section. This might be a temporary issue with your connection or our servers.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 w-full rounded-xl border border-error-200 bg-error-50 p-4 text-left overflow-auto max-h-48">
            <p className="text-xs font-semibold text-error-700 mb-2">Error Details:</p>
            <p className="font-mono text-xs text-error-600 whitespace-pre-wrap">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={reset}
            size="lg"
            className="gap-2 w-full sm:w-auto shadow-lg shadow-primary-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/x">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-8 text-sm text-secondary-500">
          If this problem persists, please{" "}
          <Link href="/support" className="text-primary-600 hover:underline font-medium">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
