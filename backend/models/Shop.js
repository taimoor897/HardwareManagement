
import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    logoUrl: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    currency: {
      type: String,
      default: "PKR",
      enum: ["PKR"],
    },

    timezone: {
      type: String,
      default: "Asia/Karachi",
    },

    invoicePrefix: {
      type: String,
      default: "INV",
      trim: true,
    },

    taxEnabled: {
      type: Boolean,
      default: false,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
