
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Rent",
        "Salaries",
        "Electricity",
        "Water",
        "Internet",
        "Transport",
        "Repairs & Maintenance",
        "Packaging",
        "Marketing",
        "Office Supplies",
        "Bank Charges",
        "Other",
      ],
      default: "Other",
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Card", "Mobile Wallet", "Other"],
      default: "Cash",
    },
    paidTo: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    reference: {
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

expenseSchema.index({ shop: 1, expenseDate: -1 });
expenseSchema.index({ shop: 1, category: 1, expenseDate: -1 });

export default mongoose.model("Expense", expenseSchema);
