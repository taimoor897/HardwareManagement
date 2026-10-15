
import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["opening", "in", "out", "adjustment"],
      required: true,
    },

    // For opening, this is the counted opening quantity.
    // For in/out, this is the quantity received or removed.
    // For adjustment, this is the newly counted physical quantity.
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

   previousStock: {
  type: Number,
  default: null,
  min: 0,
},

    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

   quantityDelta: {
  type: Number,
  default: null,
},

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ shop: 1, createdAt: -1 });
stockMovementSchema.index({ shop: 1, product: 1, createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);
