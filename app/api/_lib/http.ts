import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[api] unhandled error:', error)
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}

// Validates a JSON body against a zod schema; unknown keys are stripped.
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new ApiError(400, `${issue.path.join('.') || 'body'}: ${issue.message}`)
  }
  return result.data
}
