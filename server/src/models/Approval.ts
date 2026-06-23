import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Approval = a pending action the autopilot wants to take, waiting for the
 * owner's "yes". This is the heart of the human-in-the-loop checkpoint: the
 * cron scanners CREATE these in the background; the owner approves/dismisses.
 *
 * `dedupeKey` stops us re-raising the same alert (e.g. one debt) while an
 * earlier one is still pending.
 */
const approvalSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    kind: { type: String, enum: ["overdue_debt", "low_stock", "eod_summary", "reminder"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    draft: { type: String }, // e.g. a ready-to-send reminder message
    status: { type: String, enum: ["pending", "approved", "dismissed"], default: "pending", index: true },
    payload: { type: Schema.Types.Mixed, default: {} }, // ids + numbers the approve action needs
    dedupeKey: { type: String },
    result: { type: String }, // what happened once approved
    resolvedAt: { type: Date },
    readAt: { type: Date, default: null }, // when the owner read this in the notification drawer
  },
  { timestamps: true }
);

approvalSchema.index({ shopId: 1, status: 1, createdAt: -1 });

export type Approval = InferSchemaType<typeof approvalSchema>;
export const ApprovalModel = model("Approval", approvalSchema);
