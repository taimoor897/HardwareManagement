
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
      maxlength: 200,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 64,
      default: undefined,
    },

    barcode: {
      type: String,
      trim: true,
      maxlength: 100,
      default: undefined,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    brand: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    
    image: {
      url: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },
      originalUrl: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },
      source: {
        type: String,
        enum: ["manual", "wikimedia", "openverse", "upload", ""],
        default: "",
      },
      sourcePageUrl: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },
      license: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300,
      },
      licenseVersion: {
        type: String,
        default: "",
        trim: true,
        maxlength: 50,
      },
      licenseUrl: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },
      attribution: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },
    },


    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    wholesalePrice: {
      type: Number,
      default: null,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      enum: [
        "piece",
        "box",
        "packet",
        "bag",
        "meter",
        "foot",
        "liter",
        "kilogram",
        "gram",
        "roll",
        "set",
        "dozen",
        "other",
      ],
      default: "piece",
    },

    // Null means the opening stock is unknown.
    // Zero means the stock was explicitly counted as zero.
    currentStock: {
      type: Number,
      default: null,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },

    stockTrackingEnabled: {
      type: Boolean,
      default: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.index(
  { shop: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $type: "string" } },
  }
);

productSchema.index(
  { shop: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $type: "string" } },
  }
);

productSchema.index({ shop: 1, name: 1 });
productSchema.index({ shop: 1, category: 1, isActive: 1 });

export default mongoose.model("Product", productSchema);
