"use client";

import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/react-query";
import { SessionProvider } from "@/components/session-context";

/**
 * Providers Component
 * Wraps the app with all necessary context providers
 */
export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient instance once per component mount
  // This ensures QueryClient is stable across re-renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {children}
      </SessionProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

