/**
 * RapidForge Application Constants
 * Follows RW_ prefix convention for global maintainability.
 */

export const RW_APP_NAME = 'RapidForge IDE';
export const RW_APP_SUBTITLE = 'Professional Full-Stack Development Platform';
export const RW_APP_DESCRIPTION = 'A powerful, AI-driven IDE for building, testing, and deploying modern web applications.';
export const RW_APP_MAINTAINER = 'RapidForge Team';
export const RW_APP_VERSION = '1.2.0';
export const RW_APP_URL = 'https://rapidforge.ai';
export const RW_APP_REPO = 'https://github.com/rapidforge/core';
export const RW_APP_SUPPORT_EMAIL = 'support@rapidforge.ai';

// UI Layout Constraints
export const RW_UI_LEFT_SIDEBAR_MIN_WIDTH = 15;
export const RW_UI_LEFT_SIDEBAR_DEFAULT_WIDTH = 20;
export const RW_UI_RIGHT_SIDEBAR_MIN_WIDTH = 20;
export const RW_UI_RIGHT_SIDEBAR_DEFAULT_WIDTH = 25;
export const RW_UI_BOTTOM_PANEL_MIN_HEIGHT = 20;
export const RW_UI_BOTTOM_PANEL_DEFAULT_HEIGHT = 30;

// Performance & Limits
export const RW_MAX_FILE_SIZE_PREVIEW = 1024 * 512; // 512KB
export const RW_MAX_FILE_SIZE_CACHE = 1024 * 1024 * 5; // 5MB
export const RW_CACHE_TTL = 1000 * 60 * 30; // 30 Minutes

// AI Configuration
export const RW_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const RW_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', icon: 'zap-off' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', icon: 'zap' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', icon: 'sparkles' },
];
