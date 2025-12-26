import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";
import WebVitalsReporter from "@/components/analytics/web-vitals-reporter";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  description: "Enterprise-grade social media management platform with AI-powered content creation",
  keywords: [
    'social media management',
    'AI content',
    'calendar scheduling',
    'analytics',
    'multi-account',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Xocial - AI-Powered Social Media Management',
    description: 'Connect accounts, organize content, create with AI, and analyze performance — all in one platform.',
    siteName: 'Xocial',
    images: [
      { url: '/icon-512.png', width: 512, height: 512, alt: 'Xocial logo' },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xocial - AI-Powered Social Media Management',
    description: 'Manage accounts, create with AI, schedule, and analyze in one place.',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png' }],
    shortcut: ['/favicon.ico'],
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
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="dns-prefetch" href="https://api.openai.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <ErrorBoundary>
          <Providers>
            <main id="main-content">
              {children}
            </main>
            <Toaster position="top-right" richColors />
            {/* <WebVitalsReporter /> */}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
