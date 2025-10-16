/**
 * Tauri Desktop Integration Utilities
 * 
 * Provides helper functions for detecting and working with Tauri desktop environment
 */

/**
 * Check if the app is running in Tauri desktop mode
 */
export const isTauriApp = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Check if localStorage should be used (based on env or Tauri mode)
 */
export const shouldUseLocalStorage = (): boolean => {
  const envFlag = import.meta.env.VITE_USE_LOCAL_STORAGE;
  
  // If explicitly set in env, use that
  if (envFlag !== undefined) {
    return envFlag === 'true' || envFlag === true;
  }
  
  // Default to localStorage in Tauri desktop mode
  return isTauriApp();
};

/**
 * Log API operations when debug mode is enabled
 */
export const debugLog = (operation: string, data?: any) => {
  if (import.meta.env.VITE_DEBUG_API === 'true') {
    console.log(`[API Debug] ${operation}`, data || '');
  }
};

/**
 * Get the appropriate storage backend message for logging
 */
export const getStorageMode = (): string => {
  if (isTauriApp()) {
    return shouldUseLocalStorage() ? 'Tauri + localStorage (offline)' : 'Tauri + Network API';
  }
  return shouldUseLocalStorage() ? 'Web + localStorage' : 'Web + Network API';
};

// Export Tauri API if available (for future use)
export const getTauriAPI = async () => {
  if (isTauriApp()) {
    try {
      // Dynamically import Tauri APIs only when in Tauri context
      // Note: This is for future use when Tauri-specific features are needed
      const tauriCore = await import('@tauri-apps/api/core');
      return { invoke: tauriCore.invoke };
    } catch (error) {
      console.error('[Tauri] Failed to load Tauri APIs:', error);
      return null;
    }
  }
  return null;
};
