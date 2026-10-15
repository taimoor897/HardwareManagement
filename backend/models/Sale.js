
import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "" },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "A sale must contain at least one item.",
      },
    },

    customerName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    customerPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },

    siteName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "mobile_wallet"],
      required: true,
    },

    // Amount the customer has paid so far.
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Amount still owed by the customer.
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    changeDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
      index: true,
    },

    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ shop: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ shop: 1, createdAt: -1 });
saleSchema.index({ shop: 1, balanceDue: 1 });
saleSchema.index({ shop: 1, paymentStatus: 1, createdAt: -1 });

export default mongoose.model("Sale", saleSchema);
