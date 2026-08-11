import { randomBytes, createHash } from "node:crypto";

/** Token opaco enviado ao usuário (por e-mail); nunca persistido em texto puro. */
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
