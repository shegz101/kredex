import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { ReminderModel } from "../models/index.js";

const router = Router();

/** GET /api/reminders — all reminders, soonest first. */
router.get("/", requireAuth, async (req, res) => {
  try {
    const reminders = await ReminderModel.find({ shopId: req.shopId! }).sort({ dueAt: 1 });
    res.json({ reminders });
  } catch (err) {
    console.error("reminders list error:", err);
    res.status(500).json({ error: "Failed to load reminders" });
  }
});

const createSchema = z.object({ text: z.string().min(1, "What should we remind you about?"), dueAt: z.string().min(1) });

/** POST /api/reminders — create a reminder. */
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid reminder" });
      return;
    }
    const due = new Date(parsed.data.dueAt);
    if (isNaN(due.getTime())) {
      res.status(400).json({ error: "Pick a valid date/time" });
      return;
    }
    const reminder = await ReminderModel.create({ shopId: req.shopId!, text: parsed.data.text, dueAt: due });
    res.status(201).json({ reminder });
  } catch (err) {
    console.error("reminder create error:", err);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

/** PATCH /api/reminders/:id — mark done / dismissed / pending. */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const status = (req.body as { status?: string })?.status;
    if (status !== "pending" && status !== "done" && status !== "dismissed") {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const reminder = await ReminderModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }
    reminder.status = status;
    reminder.doneAt = status === "done" ? new Date() : undefined;
    await reminder.save();
    res.json({ reminder });
  } catch (err) {
    console.error("reminder update error:", err);
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

export default router;
