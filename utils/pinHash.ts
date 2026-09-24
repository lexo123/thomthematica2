/**
 * Checks whether a given string is a valid 4-digit PIN format.
 *
 * Rules: Exactly 4 decimal digits (0-9).
 */
export const isValidPinFormat = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

/**
 * Hashes a 4-digit PIN string using SHA-256 and returns a lowercase 64-character hexadecimal string.
 *
 * Steps:
 * 1. UTF-8 encode the PIN string using TextEncoder
 * 2. Hash using crypto.subtle.digest('SHA-256', ...)
 * 3. Convert ArrayBuffer to a lowercase hexadecimal string of exactly 64 characters
 *
 * Architectural Note:
 * Salt is intentionally omitted by design (low-threat-model, client-side identity gate).
 * This module is the single, canonical source of truth for PIN hashing across the application.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
};
