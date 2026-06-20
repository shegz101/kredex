import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * A JWT (JSON Web Token) is a signed string shaped like  header.payload.signature.
 * We put the user's identity in the payload and sign it with JWT_SECRET. Anyone
 * can READ the payload, but only our server (which holds the secret) can produce
 * a valid signature — so a tampered token fails verification.
 *
 * This wrapper keeps the rest of the app from ever touching the raw library.
 */
export interface TokenPayload {
  userId: string;
  shopId: string;
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: "7d" }; // token is valid for 7 days
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  // jwt.verify throws if the signature is bad or the token is expired.
  return jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
}
