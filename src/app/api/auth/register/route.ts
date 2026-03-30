import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { z } from 'zod';

/**
 * Validation schema for registration
 */
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/auth/register - Register a new user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const validatedData = await validateRequest(request, registerSchema);

  const supabase = createAdminClient();

  // Create auth user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: validatedData.email,
    password: validatedData.password,
    options: {
      data: {
        name: validatedData.name,
      },
    },
  });

  if (signUpError) {
    throw new APIError(400, signUpError.message, 'SIGNUP_ERROR');
  }

  if (!authData.user) {
    throw new APIError(500, 'Failed to create user', 'SIGNUP_FAILED');
  }

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: validatedData.email,
    name: validatedData.name,
  });

  if (profileError) {
    throw new APIError(500, profileError.message, 'PROFILE_CREATE_ERROR');
  }

  return successResponse({
    message: 'Registration successful. Please check your email to verify your account.',
    user: {
      id: authData.user.id,
      email: authData.user.email,
    },
  });
});

