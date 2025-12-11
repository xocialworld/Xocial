import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth Layout - Protects auth pages from already-logged-in users
 * If user is already authenticated, redirect them to the dashboard
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip auth check during build/static generation
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME) {
    return <>{children}</>;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If user is already logged in, redirect to dashboard
    if (user) {
      redirect('/x');
    }
  } catch {
    // If Supabase check fails, just render the page
    // This allows auth pages to render during build
  }

  return <>{children}</>;
}
