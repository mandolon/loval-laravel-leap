// Standard API response/error types for easy backend swapping
export type ApiOk<T> = { data: T; meta?: Record<string, unknown> }
export type ApiErr = { error: { code: string; message: string; details?: unknown } }
export type ApiResponse<T> = ApiOk<T> | ApiErr

// Helper to create success responses
export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiOk<T> => ({ 
  data, 
  meta: {
    ...meta,
    apiVersion: import.meta.env.VITE_API_VERSION || 'v1',
  }
})

// Helper to create error responses
export const err = (code: string, message: string, details?: unknown): ApiErr => ({
  error: { code, message, details }
})

// Type guard to check if response is an error
export const isApiError = (response: unknown): response is ApiErr => {
  return typeof response === 'object' && response !== null && 'error' in response
}

// Query parameters for list operations
export type ListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  phase?: string;
  search?: string;
  sort?: string;
}

// Parse sort parameter (e.g., "name:asc" or "updatedAt:desc")
export const parseSort = (sort?: string): { field: string; order: 'asc' | 'desc' } | null => {
  if (!sort) return null
  const [field, order = 'asc'] = sort.split(':')
  return { field, order: order as 'asc' | 'desc' }
}
