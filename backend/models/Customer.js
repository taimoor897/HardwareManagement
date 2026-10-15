
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerNumber: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: 120,
    },
    customerType: {
      type: String,
      enum: ["individual", "business"],
      default: "individual",
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: 25,
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 150,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

customerSchema.index({ shop: 1, createdAt: -1 });
customerSchema.index({ shop: 1, name: 1 });
customerSchema.index({ shop: 1, phone: 1 });

export default mongoose.model("Customer", customerSchema);
