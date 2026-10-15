
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.index(
  { shop: 1, name: 1 },
  { unique: true }
);

export default mongoose.model("Category", categorySchema);
