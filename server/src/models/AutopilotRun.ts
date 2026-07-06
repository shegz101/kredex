import { Schema, model, InferSchemaType } from "mongoose";

/**
 * AutopilotRun = a record of one autonomous pass the agent made over a shop.
 * This is the visible proof that Kredex worked on its own — what it detected,
 * what it did without asking, and what it flagged for the owner. The Autopilot
 * page renders these as a "runs" timeline.
 */
const lineSchema = new Schema(
  { kind: String, title: String, result: String },
  { _id: false }
);

const autopilotRunSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    trigger: { type: String, enum: ["scheduled", "manual"], default: "scheduled" },
    detected: {
      overdueDebts: { type: Number, default: 0 },
      lowStock: { type: Number, default: 0 },
      dueReminders: { type: Number, default: 0 },
      eodSummary: { type: Number, default: 0 },
    },
    autoExecuted: { type: [lineSchema], default: [] }, // actions the autopilot took itself
    pendingApproval: { type: [lineSchema], default: [] }, // actions it flagged for the owner
    autonomy: { type: String }, // the trust level in effect for this run
    summary: { type: String, required: true }, // one-line, human-readable
  },
  { timestamps: true }
);

autopilotRunSchema.index({ shopId: 1, createdAt: -1 });

export type AutopilotRun = InferSchemaType<typeof autopilotRunSchema>;
export const AutopilotRunModel = model("AutopilotRun", autopilotRunSchema);
