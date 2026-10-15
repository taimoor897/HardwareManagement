
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "mobile_wallet"],
      required: true,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ shop: 1, sale: 1, createdAt: -1 });
paymentSchema.index({ shop: 1, createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
