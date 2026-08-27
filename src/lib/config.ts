/**
 * PyDataLab Application Configuration
 */

// Self sign-up policy: false = admin issue accounts only (default), true = self-service sign up allowed
export const ALLOW_SELF_SIGNUP = false;

// Internal Auth email domain for ID-based authentication
export const AUTH_EMAIL_DOMAIN = "@ubion.kdt";

/**
 * Converts user ID (e.g. 'DF08001' or 'df08001') to internal Supabase Auth email ('df08001@ubion.kdt').
 */
export function idToEmail(id: string): string {
  const trimmed = id.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}${AUTH_EMAIL_DOMAIN}`;
}

/**
 * Extracts student ID from internal email (e.g. 'df08001@ubion.kdt' -> 'DF08001').
 */
export function emailToId(email?: string | null): string {
  if (!email) return "";
  const prefix = email.split("@")[0];
  return prefix.toUpperCase();
}
