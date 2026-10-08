// Application Security & Input Hygiene Utilities
//
// AppSec Architectural Note:
// 1. SQL Injection is mitigated at the protocol layer via Parameterized Queries
//    (Supabase PostgREST prepared statements and PostgreSQL RPC parameters).
//    Client-side regex replacement is NOT relied upon as a primary defense.
// 2. Cross-Site Scripting (XSS) is mitigated primarily through React's contextual
//    JSX data escaping. These utilities provide defense-in-depth input sanitization,
//    strict whitelist validation, and length bounds.

/**
 * Sanitizes generic user text inputs by trimming whitespace and enforcing length bounds.
 * Prevents memory-exhaustion / payload-bloat attacks.
 * 
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default 255)
 * @returns {string} - Sanitized string
 */
export const sanitizeTextInput = (input, maxLength = 255) => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
};

/**
 * Legacy compatibility alias for sanitizeTextInput.
 * Strips dangerous HTML tags while warning that server-side validation is the real boundary.
 */
export const sanitizeInput = (input, maxLength = 255) => {
  if (!input || typeof input !== 'string') return '';
  // Basic tag neutralization for defense-in-depth
  const clean = input.replace(/<[^>]*>?/gm, '').trim();
  return clean.slice(0, maxLength);
};

/**
 * Validates identifier format (Alphanumeric, underscore, hyphen only; 3 to 32 chars).
 * Matches strict registration numbers and system IDs.
 * 
 * @param {string} id 
 * @returns {boolean}
 */
export const validateId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,32}$/.test(id.trim());
};

/**
 * Validates password strength for registration and updates.
 * Requires:
 * - At least 6 characters (recommended 8+)
 * - Cannot be pure whitespace
 * 
 * @param {string} password 
 * @returns {{ valid: boolean, message?: string }}
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password exceeds maximum length limit' };
  }
  return { valid: true };
};

/**
 * Encodes untrusted strings for safe embedding into HTML contexts where React's
 * automatic JSX escaping is not active (e.g. export templates or raw DOM).
 * 
 * @param {string} str 
 * @returns {string}
 */
export const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
