import { randomInt } from "node:crypto";

/**
 * Crockford base32 minus the usual alphabet's ambiguous characters are
 * already excluded by Crockford's design (no I, L, O, U) — kept here as an
 * explicit allowlist so the alphabet can't silently drift.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP_SIZE = 4;
const GROUP_COUNT = 4;
const CHAR_COUNT = GROUP_SIZE * GROUP_COUNT; // 16 chars

/** Bits of entropy per character: log2(32). */
const BITS_PER_CHAR = 5;
export const SESSION_TOKEN_ENTROPY_BITS = CHAR_COUNT * BITS_PER_CHAR; // 80 bits

/**
 * Generates a recovery code for a batch/session: high-entropy (80 bits, so
 * brute force is infeasible even before rate limiting), but short enough
 * for a person to read back and type — grouped like "ABCD-EFGH-JKMN-PQRS".
 *
 * Never derived from anything guessable (no timestamps, no sequential
 * counters) — see docs/architecture.md's session-token security notes.
 */
export function generateSessionToken(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUP_COUNT; g++) {
    let group = "";
    for (let i = 0; i < GROUP_SIZE; i++) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

const SESSION_TOKEN_PATTERN = new RegExp(
  `^[${ALPHABET}]{${GROUP_SIZE}}(-[${ALPHABET}]{${GROUP_SIZE}}){${GROUP_COUNT - 1}}$`,
);

/** Validates the shape of a user-submitted recovery code before any lookup. */
export function isValidSessionTokenFormat(candidate: string): boolean {
  return SESSION_TOKEN_PATTERN.test(candidate.toUpperCase());
}
