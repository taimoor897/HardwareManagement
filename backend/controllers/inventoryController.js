
import mongoose from "mongoose";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

const validTypes = ["opening", "in", "out", "adjustment"];

export async function applyStockMovement(req, res, next) {
  const { type, quantity, reason, reference = "" } = req.body;

  if (!validTypes.includes(type)) {
    return fail(res, 400, "Select a valid stock movement type.");
  }

  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    (["in", "out"].includes(type) && quantity <= 0)
  ) {
    return fail(
      res,
      400,
      "Enter a valid quantity. Stock-in and stock-out quantities must be greater than zero."
    );
  }

  if (type === "opening" && quantity < 0) {
    return fail(res, 400, "Opening stock cannot be negative.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    return fail(res, 400, "A reason is required for every stock movement.");
  }

  if (reason.trim().length > 300) {
    return fail(res, 400, "The reason cannot exceed 300 characters.");
  }

  if (
    typeof reference !== "string" ||
    reference.trim().length > 100
  ) {
    return fail(res, 400, "The reference cannot exceed 100 characters.");
  }

  if (!mongoose.isValidObjectId(req.params.productId)) {
    return fail(res, 400, "Invalid product ID.");
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: req.params.productId,
        shop: req.shop._id,
        isActive: true,
      }).session(session);

      if (!product) {
        const error = new Error("Product not found.");
        error.status = 404;
        throw error;
      }

      if (!product.stockTrackingEnabled) {
        const error = new Error(
          "Stock tracking is disabled for this product."
        );
        error.status = 400;
        throw error;
      }

      const previousStock = product.currentStock;

      if (type === "opening" && previousStock !== null) {
        const error = new Error(
          "Opening stock has already been recorded. Use a physical stock adjustment instead."
        );
        error.status = 409;
        throw error;
      }

      if (type !== "opening" && previousStock === null) {
        const error = new Error(
          "This product has unknown stock. Record its opening stock first."
        );
        error.status = 409;
        throw error;
      }

      let newStock;

      if (type === "opening") {
        newStock = quantity;
      } else if (type === "in") {
        newStock = previousStock + quantity;
      } else if (type === "out") {
        if (quantity > previousStock) {
          const error = new Error(
            `Insufficient stock. Available quantity: ${previousStock}.`
          );
          error.status = 400;
          throw error;
        }

        newStock = previousStock - quantity;
      } else {
        // Adjustment quantity is the physical count, not the difference.
        newStock = quantity;
      }

      product.currentStock = newStock;
      product.updatedBy = req.user._id;
      await product.save({ session });

      const [movement] = await StockMovement.create(
        [
          {
            shop: req.shop._id,
            product: product._id,
            type,
            quantity,
            previousStock: type === "opening" ? null : previousStock,
quantityDelta: type === "opening" ? null : newStock - previousStock,
            newStock,
            quantityDelta:
              type === "opening" ? newStock : newStock - previousStock,
            reason: reason.trim(),
            reference: reference.trim(),
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      result = {
        product: {
          id: product._id,
          name: product.name,
          sku: product.sku || "",
          unit: product.unit,
          currentStock: product.currentStock,
          lowStockThreshold: product.lowStockThreshold,
          purchasePrice: product.purchasePrice,
        },
        movement,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Inventory updated successfully.",
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return fail(res, error.status, error.message);
    }

    if (error.name === "CastError") {
      return fail(res, 400, "Invalid product ID.");
    }

    next(error);
  } finally {
    await session.endSession();
  }
}

export async function getInventorySummary(req, res, next) {
  try {
    const shop = req.shop._id;
    const activeFilter = {
      shop,
      isActive: true,
      stockTrackingEnabled: true,
    };

    const [
      totalProducts,
      knownStockProducts,
      unknownStockProducts,
      lowStockProducts,
      outOfStockProducts,
      valuation,
    ] = await Promise.all([
      Product.countDocuments(activeFilter),

      Product.countDocuments({
        ...activeFilter,
        currentStock: { $ne: null },
      }),

      Product.countDocuments({
        ...activeFilter,
        currentStock: null,
      }),

      Product.countDocuments({
        ...activeFilter,
        $expr: {
          $and: [
            { $ne: ["$currentStock", null] },
            { $gt: ["$currentStock", 0] },
            { $lte: ["$currentStock", "$lowStockThreshold"] },
          ],
        },
      }),

      Product.countDocuments({
        ...activeFilter,
        currentStock: 0,
      }),

      Product.aggregate([
        {
          $match: {
            ...activeFilter,
            currentStock: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$currentStock" },
            stockValue: {
              $sum: { $multiply: ["$currentStock", "$purchasePrice"] },
            },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        totalProducts,
        knownStockProducts,
        unknownStockProducts,
        lowStockProducts,
        outOfStockProducts,
        totalUnits: valuation[0]?.totalUnits ?? 0,
        stockValue: valuation[0]?.stockValue ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listStockMovements(req, res, next) {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = { shop: req.shop._id };

    if (req.query.productId) {
      if (!mongoose.isValidObjectId(req.query.productId)) {
        return fail(res, 400, "Invalid product filter.");
      }
      filter.product = req.query.productId;
    }

    if (req.query.type) {
      if (!validTypes.includes(req.query.type)) {
        return fail(res, 400, "Invalid movement type filter.");
      }
      filter.type = req.query.type;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate("product", "name sku unit")
        .populate("createdBy", "name")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      StockMovement.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
