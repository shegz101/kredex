import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Reminder = a personal nudge the owner sets ("call Alhaji Friday to supply rice",
 * "pay rent on the 30th"), surfaced on the Reminders page when it falls due.
 */
const reminderSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    text: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "done", "dismissed"], default: "pending", index: true },
    doneAt: { type: Date },
  },
  { timestamps: true }
);

reminderSchema.index({ shopId: 1, status: 1, dueAt: 1 });

export type Reminder = InferSchemaType<typeof reminderSchema>;
export const ReminderModel = model("Reminder", reminderSchema);
