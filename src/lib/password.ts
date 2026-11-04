import "server-only";
import { randomBytes, scrypt } from "node:crypto";

// scrypt password hashes, stored as "scrypt-v1$<salt>$<hash>". Used by member
// sign-in and by website editors. The database compares the derived hash, so
// the stored one never leaves it.

export function derive(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key.toString("hex"))));
}

export async function encodePassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${await derive(password, salt)}`;
}
