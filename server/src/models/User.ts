import { Schema, model, InferSchemaType } from "mongoose";

/**
 * User = a shop OWNER who logs into Kredex.
 * (Customers are NOT users — see Customer.ts.)
 *
 * We store only a password *hash*, never the raw password. The hashing
 * happens in the auth layer (bcrypt) before we ever call .create().
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // no two accounts share an email
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true }, // optional; useful for WhatsApp later
    passwordHash: { type: String, required: true },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
