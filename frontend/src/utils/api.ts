/**
 * API Configuration
 * Uses environment variables for production, falls back to localhost for development
 * 
 * Note: WebSocket URL is automatically derived from API_URL by converting:
 * - http:// -> ws://
 * - https:// -> wss://
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Automatically derive WebSocket URL from API_URL
// Converts http:// to ws:// and https:// to wss://
export const WS_SERVER = API_URL.replace(/^http/, 'ws');

/**
 * Helper function to build API endpoint URLs
 */
export function apiEndpoint(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
}

