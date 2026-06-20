import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

/**
 * Gatekeeper for protected routes. It runs BEFORE the route handler:
 *   1. reads the "Authorization: Bearer <token>" header
 *   2. verifies the token
 *   3. attaches req.userId + req.shopId so handlers know who is acting
 *   4. calls next() to continue — or responds 401 to block.
 *
 * Mount it per-route:  router.get("/something", requireAuth, handler)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.shopId = payload.shopId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
