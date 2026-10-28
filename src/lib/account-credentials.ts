import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const value = process.env.ACCOUNT_CREDENTIALS_KEY;
  if (!value) throw new Error("ACCOUNT_CREDENTIALS_KEY is not configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("ACCOUNT_CREDENTIALS_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptAccountPassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString("base64url")).join(".");
}

export function decryptAccountPassword(value: string): string {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Encrypted account credential has an invalid format.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}
