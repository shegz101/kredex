import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Reminder = a personal nudge the owner sets ("call Alhaji Friday to supply rice",
 * "pay rent on the 30th"). The autopilot watches these and surfaces them in the
 * approval feed / notifications the moment they fall due.
 */
const reminderSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    text: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "done", "dismissed"], default: "pending", index: true },
    notifiedAt: { type: Date, default: null }, // when the autopilot raised it
    doneAt: { type: Date },
  },
  { timestamps: true }
);

reminderSchema.index({ shopId: 1, status: 1, dueAt: 1 });

export type Reminder = InferSchemaType<typeof reminderSchema>;
export const ReminderModel = model("Reminder", reminderSchema);
