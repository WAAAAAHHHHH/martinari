// Client-side room code validator (mirrors server logic)
export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string') return false;
  if (code.length !== 6) return false;
  return /^[A-HJ-NP-Z2-9]{6}$/i.test(code);
}
