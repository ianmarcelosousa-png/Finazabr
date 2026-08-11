import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "./env.js";

export interface AuthTokenPayload {
  sub: string;
}

export function signAuthToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, env.JWT_SECRET, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Token inválido");
  }
  return { sub: decoded.sub };
}
