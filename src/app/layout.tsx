import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,
  adjustFontFallback: true, // Reduce layout shift
});

export const metadata: Metadata = {
  title: {
    template: '%s | Xocial',
    default: 'Xocial - AI-Powered Social Media Management',
  },
  description: "Enterprise-grade social media management platform with AI-powered content creation",
  
  // Performance hints
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical domains for faster loading */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href="https://api.openai.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster position="top-right" richColors />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

