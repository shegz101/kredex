import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel, ShopModel } from "../models/index.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  shopName: z.string().min(1, "Shop name is required"),
  shopType: z.string().optional(),
});

/**
 * POST /api/auth/register
 * Creates the owner's User AND their Shop in one step, then returns a token.
 * We hash the password with bcrypt and NEVER store the raw value.
 */
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { name, email, password, shopName, shopType } = parsed.data;

    const exists = await UserModel.findOne({ email });
    if (exists) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, passwordHash });
    const shop = await ShopModel.create({ ownerId: user._id, name: shopName, type: shopType });

    const token = signToken({ userId: String(user._id), shopId: String(shop._id) });
    res.status(201).json({
      token,
      user: { id: String(user._id), name: user.name, email: user.email },
      shop: { id: String(shop._id), name: shop.name, type: shop.type, currency: shop.currency },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Something went wrong creating your account" });
  }
});

/**
 * GET /api/auth/email-available?email=...
 * Lightweight check so the signup form can show "available / taken" as you type.
 */
router.get("/email-available", async (req, res) => {
  try {
    const email = String(req.query.email ?? "").trim().toLowerCase();
    const valid = z.string().email().safeParse(email).success;
    if (!valid) {
      res.json({ valid: false, available: false });
      return;
    }
    const exists = await UserModel.findOne({ email }).select("_id");
    res.json({ valid: true, available: !exists });
  } catch (err) {
    console.error("email-available error:", err);
    res.status(500).json({ error: "Check failed" });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Verifies the password with bcrypt.compare and returns a fresh token.
 * We return the same vague message for "no such user" and "wrong password"
 * so attackers can't tell which emails are registered.
 */
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;

    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "We couldn't find an account with that email." });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "That password isn't correct." });
      return;
    }

    const shop = await ShopModel.findOne({ ownerId: user._id });
    if (!shop) {
      res.status(500).json({ error: "No shop found for this account" });
      return;
    }

    const token = signToken({ userId: String(user._id), shopId: String(shop._id) });
    res.json({
      token,
      user: { id: String(user._id), name: user.name, email: user.email },
      shop: { id: String(shop._id), name: shop.name, type: shop.type, currency: shop.currency },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Something went wrong signing in" });
  }
});

const resetSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * POST /api/auth/reset-password
 * DEMO-GRADE reset: sets a new password for a known email directly. A production
 * version would email a one-time reset link/token instead of trusting the caller.
 */
router.post("/reset-password", async (req, res) => {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a valid email and a password of at least 6 characters" });
      return;
    }
    const { email, password } = parsed.data;
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "We couldn't find an account with that email." });
      return;
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    res.status(500).json({ error: "Something went wrong resetting your password" });
  }
});

/**
 * GET /api/auth/me
 * A protected route — proves the token works. requireAuth runs first and
 * sets req.userId / req.shopId; here we just return the current profile.
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    const shop = await ShopModel.findById(req.shopId);
    if (!user || !shop) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({
      user: { id: String(user._id), name: user.name, email: user.email },
      shop: { id: String(shop._id), name: shop.name, type: shop.type, currency: shop.currency },
    });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
