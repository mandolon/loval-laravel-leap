import type { ApiErr } from './transport'
import { isApiError } from './transport'

// Standard error codes
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

// Extract user-friendly error message from various error types
export function handleApiError(error: unknown): string {
  // Handle our standardized API errors
  if (isApiError(error)) {
    return error.error.message
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as any).issues
    if (Array.isArray(issues) && issues.length > 0) {
      return issues[0].message
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Fallback
  return 'An unexpected error occurred'
}

// Create a standardized error object
export function createApiError(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: unknown
): ApiErr {
  return {
    error: {
      code: ErrorCodes[code],
      message,
      details,
    },
  }
}

// Log API errors in debug mode
export function logApiError(operation: string, error: unknown): void {
  if (import.meta.env.VITE_DEBUG_API === 'true') {
    console.error(`[API Error] ${operation}:`, error)
  }
}
