import { randomBytes } from "crypto";

// Crockford base32 alphabet (no I, L, O, U) — disambiguates voice/text sharing.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function formatInviteCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== CODE_LENGTH) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
