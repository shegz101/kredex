import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";
import { ShopModel, UserModel } from "../models/index.js";

const router = Router();

/** GET /api/settings — shop profile + account basics. */
router.get("/", requireAuth, async (req, res) => {
  try {
    const [shop, user] = await Promise.all([ShopModel.findById(req.shopId!), UserModel.findById(req.userId!)]);
    if (!shop || !user) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      shop: { name: shop.name, type: shop.type ?? "", currency: shop.currency ?? "NGN", lowStockThreshold: shop.lowStockThreshold ?? 5, location: shop.location ?? "" },
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("settings get error:", err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

const shopSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  currency: z.string().min(1).optional(),
  lowStockThreshold: z.number().min(0).max(100000).optional(),
  location: z.string().optional(),
});

/** PATCH /api/settings/shop — update shop profile + the low-stock default. */
router.patch("/shop", requireAuth, async (req, res) => {
  try {
    const parsed = shopSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const shop = await ShopModel.findById(req.shopId!);
    if (!shop) {
      res.status(404).json({ error: "Shop not found" });
      return;
    }
    Object.assign(shop, parsed.data);
    await shop.save();
    res.json({ shop: { name: shop.name, type: shop.type ?? "", currency: shop.currency ?? "NGN", lowStockThreshold: shop.lowStockThreshold ?? 5, location: shop.location ?? "" } });
  } catch (err) {
    console.error("settings shop error:", err);
    res.status(500).json({ error: "Failed to update shop" });
  }
});

const pwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

/** POST /api/settings/password — change password (verifies current). */
router.post("/password", requireAuth, async (req, res) => {
  try {
    const parsed = pwSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const user = await UserModel.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("settings password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
