"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error:", error);
    }, [error]);

    return (
        <html lang="en">
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-error-50 to-secondary-50 px-4 font-sans">
                    <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-error-100">
                        <div className="mb-6 flex justify-center">
                            <div className="h-20 w-20 bg-error-100 rounded-full flex items-center justify-center animate-bounce-slow">
                                <AlertTriangle className="h-10 w-10 text-error-600" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                            Critical Error
                        </h1>

                        <p className="text-secondary-600 mb-8">
                            Something went wrong at the system level. We&apos;ve logged this issue and our team has been notified.
                        </p>

                        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-8 text-left overflow-auto max-h-32">
                            <p className="text-xs text-secondary-500 font-mono break-all">
                                {error.message || "Unknown system error"}
                                {error.digest && <span className="block mt-1 text-secondary-400">Digest: {error.digest}</span>}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={reset} size="lg" className="w-full sm:w-auto">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>

                            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" />
                                    Go Home
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
