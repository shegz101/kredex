import rateLimit from "express-rate-limit";

const shared = { standardHeaders: true, legacyHeaders: false } as const;

/** Generous catch-all so a single client can't hammer the API. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  max: 150,
  message: { error: "Too many requests — please slow down." },
});

/** Tight limit on auth to blunt brute-force / credential stuffing. */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  max: 12,
  message: { error: "Too many attempts. Please wait a minute and try again." },
});

/** Protects the expensive (and metered) Qwen-backed endpoints + the $40 budget. */
export const aiLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  max: 25,
  message: { error: "Slow down a moment — too many AI requests in a short time." },
});
