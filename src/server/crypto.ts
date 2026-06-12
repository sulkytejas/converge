import crypto from "node:crypto";
import { env } from "~/env";

// AES-256-GCM for secrets that must be recoverable (e.g. university-portal
// passwords). Stored shape: "iv:tag:ciphertext", each part base64.

function key(): Buffer {
  // Hash whatever-length secret down to the 32 bytes GCM needs.
  const secret = env.CREDENTIAL_ENCRYPTION_KEY ?? env.AUTH_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split(":");
  if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
