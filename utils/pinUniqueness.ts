/**
 * Pure function that checks whether a candidate PIN hash is already taken among existing hashes.
 *
 * Scope definition:
 * `existingHashes` must ALWAYS consist ONLY of the current authenticated parent's own
 * `profiles.pin_hash` + that parent's own children's `pin_hash` records (`parent_id = auth.uid()`).
 * It must NEVER execute or rely upon any wide or global cross-account query.
 *
 * IMPORTANT ARCHITECTURAL NOTE:
 * This is a best-effort, non-atomic, client-side guard. It does NOT provide a database-level
 * uniqueness guarantee (there is no cross-table DB UNIQUE constraint between profiles and children,
 * which is an intentional architectural decision for this low-threat-model identity gate).
 * Theoretically, two concurrent submissions (e.g. across two browser tabs or devices) could pick
 * the same PIN before client state synchronizes.
 *
 * @param candidateHash The lowercase 64-character SHA-256 hash of the candidate PIN.
 * @param existingHashes Array of existing family PIN hashes (safely handles null/undefined).
 * @returns true if candidateHash matches any non-empty existing hash; false otherwise.
 */
export const isPinTaken = (
  candidateHash: string,
  existingHashes: (string | null | undefined)[]
): boolean => {
  if (!candidateHash) return false;
  return existingHashes.some(
    hash => typeof hash === 'string' && hash.length > 0 && hash === candidateHash
  );
};
