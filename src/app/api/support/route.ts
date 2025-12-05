import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandler, validateRequest, successResponse, APIError } from '@/lib/api-middleware'

const schema = z.object({ name: z.string().min(1), email: z.string().email(), message: z.string().min(1) })

async function handler(request: NextRequest) {
  if (request.method !== 'POST') {
    throw new APIError(405, 'Method Not Allowed', 'METHOD_NOT_ALLOWED')
  }
  const body = await validateRequest(request, schema)
  return successResponse({ ok: true })
}

export const POST = withErrorHandler(handler)

