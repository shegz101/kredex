import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { InvoiceModel, ShopModel, CustomerModel } from "../models/index.js";
import { streamInvoicePdf } from "../lib/invoicePdf.js";

const router = Router();

/** GET /api/invoices — list this shop's invoices, newest first. */
router.get("/", requireAuth, async (req, res) => {
  try {
    const invoices = await InvoiceModel.find({ shopId: req.shopId! }).sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (err) {
    console.error("invoices list error:", err);
    res.status(500).json({ error: "Failed to load invoices" });
  }
});

const createSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  items: z
    .array(z.object({ name: z.string().min(1), quantity: z.number().positive(), unitPrice: z.number().nonnegative() }))
    .min(1, "Add at least one item"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/** POST /api/invoices — create a new invoice with an auto-generated number. */
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid invoice" });
      return;
    }
    const shopId = req.shopId!;
    const { customerName, items, dueDate, notes } = parsed.data;

    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const count = await InvoiceModel.countDocuments({ shopId });
    const number = `KRD-${String(count + 1).padStart(3, "0")}`;

    // link to an existing customer if the name matches
    const customer = await CustomerModel.findOne({
      shopId,
      name: new RegExp(`^${customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    const due = dueDate ? new Date(dueDate) : undefined;
    const invoice = await InvoiceModel.create({
      shopId,
      number,
      customerName,
      customerId: customer?._id,
      items,
      total,
      notes: notes ?? undefined,
      dueDate: due && !isNaN(due.getTime()) ? due : undefined,
    });

    res.status(201).json({ invoice });
  } catch (err) {
    console.error("invoice create error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/** PATCH /api/invoices/:id — mark paid / unpaid. */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const status = (req.body as { status?: string })?.status;
    if (status !== "paid" && status !== "unpaid") {
      res.status(400).json({ error: "status must be 'paid' or 'unpaid'" });
      return;
    }
    const invoice = await InvoiceModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    invoice.status = status;
    invoice.paidAt = status === "paid" ? new Date() : undefined;
    await invoice.save();
    res.json({ invoice });
  } catch (err) {
    console.error("invoice update error:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

/** GET /api/invoices/:id/pdf — download the branded PDF. */
router.get("/:id/pdf", requireAuth, async (req, res) => {
  try {
    const invoice = await InvoiceModel.findOne({ _id: req.params.id, shopId: req.shopId! });
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const shop = await ShopModel.findById(req.shopId!);
    streamInvoicePdf(res, { invoice, shop });
  } catch (err) {
    console.error("invoice pdf error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
