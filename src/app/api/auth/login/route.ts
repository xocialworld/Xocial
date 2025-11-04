import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { z } from 'zod';

/**
 * Validation schema for login
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login - Login user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const validatedData = await validateRequest(request, loginSchema);

  const supabase = await createClient();

  // Sign in user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password,
  });

  if (error) {
    throw new APIError(401, error.message, 'LOGIN_ERROR');
  }

  if (!data.user) {
    throw new APIError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return successResponse({
    user: data.user,
    profile,
    session: data.session,
  });
});

