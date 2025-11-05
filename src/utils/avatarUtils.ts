/**
 * Avatar utilities for consistent avatar color and initials handling across the app.
 * 
 * Note: Despite the field name `avatar_url`, it stores CSS color values (hex colors),
 * not image URLs. This is a legacy naming inconsistency.
 */

/**
 * Default avatar color (fallback when user hasn't set a color)
 */
export const DEFAULT_AVATAR_COLOR = '#202020';

/**
 * Gets the avatar color from a user object.
 * Handles both snake_case (avatar_url) and camelCase (avatarUrl) for compatibility.
 * 
 * @param user - User object with optional avatar_url or avatarUrl property
 * @returns CSS color value (hex color)
 */
export function getAvatarColor(user: { avatar_url?: string | null; avatarUrl?: string | null } | null | undefined): string {
  if (!user) return DEFAULT_AVATAR_COLOR;
  
  // Check snake_case first (database field name)
  if (user.avatar_url && user.avatar_url.trim()) {
    return user.avatar_url;
  }
  
  // Fallback to camelCase for compatibility
  if (user.avatarUrl && user.avatarUrl.trim()) {
    return user.avatarUrl;
  }
  
  return DEFAULT_AVATAR_COLOR;
}

/**
 * Generates initials from a user's name.
 * 
 * @param name - User's full name
 * @returns Two-letter initials (e.g., "John Doe" -> "JD")
 */
export function getAvatarInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  
  // Get first letter of first name
  const first = parts[0]?.[0]?.toUpperCase() || '';
  
  // Get first letter of last name if available, otherwise second letter of first name
  const second = parts.length > 1 
    ? parts[parts.length - 1]?.[0]?.toUpperCase() || ''
    : parts[0]?.[1]?.toUpperCase() || '';
  
  return (first + second).slice(0, 2) || 'U';
}

