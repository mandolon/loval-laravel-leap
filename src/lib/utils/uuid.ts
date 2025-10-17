/**
 * Generate a unique ID for file viewer tabs
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
