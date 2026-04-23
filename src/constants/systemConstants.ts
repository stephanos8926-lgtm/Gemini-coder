/**
 * @file systemConstants.ts
 * @description Global technical constants using the RW_ naming convention.
 * Ensures modularity and prevents hardcoded magic numbers across the codebase.
 */

export const SYSTEM_CONSTANTS = {
  /** Base API endpoint for backend services */
  RW_API_BASE: (typeof window !== 'undefined' ? import.meta.env.VITE_API_BASE : process.env.VITE_API_BASE) || '',

  /** Maximum number of messages to keep in memory cache (LRU) */
  RW_MAX_CHAT_CACHE_SIZE: 50,

  /** Maximum character length for a single model response chunk to cache */
  RW_MAX_RESPONSE_CHUNK_LENGTH: 500000,

  /** Default temperature setting for AI generation */
  RW_DEFAULT_TEMPERATURE: 0.7,

  /** TTL for L1 Memory Cache in milliseconds (15 minutes) */
  RW_CACHE_L1_TTL: 1000 * 60 * 15,

  /** Maximum size for L1 Memory Cache (5MB) */
  RW_CACHE_L1_MAX_SIZE: 5 * 1024 * 1024,

  /** Minimum size for mobile touch targets (Industry standard: 44px) */
  RW_MOBILE_TOUCH_TARGET_MIN: 44,

  /** Interval for real-time filesystem synchronization */
  RW_SYNC_POLLING_INTERVAL: 3000,
  
  /** WebSocket event for filesystem updates */
  RW_WS_FS_UPDATE: 'fs:update',
};

export default SYSTEM_CONSTANTS;
