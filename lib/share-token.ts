import { randomBytes, createHmac } from "crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateShareToken(): string {
  // 18 random characters from a 32-symbol alphabet ≈ 90 bits of entropy.
  const bytes = randomBytes(18);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** HMAC over the token + household for tamper detection in URLs (optional). */
export function signToken(token: string, householdId: string): string {
  const secret = process.env.SHARE_LINK_SECRET ?? "fallback-secret";
  return createHmac("sha256", secret).update(`${token}:${householdId}`).digest("hex").slice(0, 16);
}
