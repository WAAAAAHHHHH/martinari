import { randomBytes } from 'crypto';

// Unambiguous characters — no 0/O, 1/I/L to prevent confusion when reading aloud
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Generates a cryptographically random, human-readable 6-character room code.
 * Uses a character set that avoids visually ambiguous characters.
 */
export function generateRoomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Validates that a room code matches the expected format.
 */
export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string') return false;
  if (code.length !== CODE_LENGTH) return false;
  const validPattern = /^[A-HJ-NP-Z2-9]{6}$/;
  return validPattern.test(code.toUpperCase());
}
