
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import Sale from "../models/Sale.js";
import StockMovement from "../models/StockMovement.js";
import Payment from "../models/Payment.js";

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

function makeInvoiceNumber(prefix = "INV") {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

export async function checkout(req, res, next) {
  const session = await mongoose.startSession();
  let committedSale;

  try {
    const {
      items,
      discount = 0,
      paymentMethod = "cash",
      amountPaid,
      customerName = "",
      customerPhone = "",
      siteName = "",
    } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      fail(400, "Add at least one product to the cart.");
    }

    if (
      !["cash", "card", "bank_transfer", "mobile_wallet"].includes(
        paymentMethod
      )
    ) {
      fail(400, "Select a valid payment method.");
    }

    if (typeof siteName !== "string" || siteName.length > 150) {
      fail(400, "Site name must be text with a maximum of 150 characters.");
    }

    if (
      typeof customerName !== "string" ||
      typeof customerPhone !== "string"
    ) {
      fail(400, "Customer name and phone must be text.");
    }

    const safeSiteName = siteName.trim();
    const safeCustomerName = customerName.trim().slice(0, 150);
    const safeCustomerPhone = customerPhone.trim().slice(0, 30);
    const parsedDiscount = Number(discount);

    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      fail(400, "Discount must be a valid non-negative amount.");
    }

    // Combine duplicate product IDs to avoid processing a cart line twice.
    const quantities = new Map();

    for (const item of items) {
      const productId = String(item?.productId || "");
      const quantity = Number(item?.quantity);

      if (!mongoose.isValidObjectId(productId)) {
        fail(400, "One of the cart products is invalid.");
      }

      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
        fail(400, "Each product must have a valid quantity.");
      }

      quantities.set(
        productId,
        (quantities.get(productId) || 0) + quantity
      );
    }

    await session.withTransaction(async () => {
      const shop = await Shop.findById(req.shop._id).session(session);

      if (!shop || !shop.isActive) {
        fail(403, "This shop is not active.");
      }

      const saleItems = [];
      let subtotal = 0;

      for (const [productId, quantity] of quantities.entries()) {
        const product = await Product.findOne({
          _id: productId,
          shop: req.shop._id,
          isActive: true,
        }).session(session);

        if (!product) {
          fail(400, "A product is no longer available. Refresh the cart.");
        }

        if (!product.stockTrackingEnabled) {
          fail(
            400,
            `${product.name} does not have stock tracking enabled.`
          );
        }

        if (
          product.currentStock === null ||
          product.currentStock === undefined
        ) {
          fail(
            400,
            `Opening stock has not been recorded for ${product.name}. Record its stock before selling.`
          );
        }

        const unitPrice = roundMoney(product.salePrice);
        const lineTotal = roundMoney(unitPrice * quantity);

        saleItems.push({
          product: product._id,
          name: product.name,
          sku: product.sku || "",
          unit: product.unit,
          quantity,
          unitPrice,
          purchasePrice: product.purchasePrice,
          lineTotal,
        });

        subtotal = roundMoney(subtotal + lineTotal);
      }

      if (parsedDiscount > subtotal) {
        fail(400, "Discount cannot exceed the subtotal.");
      }

      const safeDiscount = roundMoney(parsedDiscount);
      const taxableAmount = roundMoney(subtotal - safeDiscount);
      const taxRate = shop.taxEnabled ? Number(shop.taxRate || 0) : 0;
      const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
      const total = roundMoney(taxableAmount + taxAmount);

      // If amountPaid is omitted, assume the customer pays the full total.
      const paid =
        amountPaid === undefined || amountPaid === null || amountPaid === ""
          ? total
          : Number(amountPaid);

      if (!Number.isFinite(paid) || paid < 0) {
        fail(400, "Enter a valid payment amount.");
      }

      const safePaid = roundMoney(paid);

      // Non-cash payments cannot receive change.
      if (paymentMethod !== "cash" && safePaid > total) {
        fail(
          400,
          "For non-cash payments, the amount paid cannot exceed the total."
        );
      }

      // Calculate the unpaid balance and change.
      const balanceDue = roundMoney(Math.max(0, total - safePaid));
      const changeDue =
        paymentMethod === "cash"
          ? roundMoney(Math.max(0, safePaid - total))
          : 0;

      const paymentStatus =
        balanceDue <= 0
          ? "paid"
          : safePaid > 0
            ? "partial"
            : "unpaid";

      // Require a customer name when money is still owed.
      if (balanceDue > 0 && !safeCustomerName) {
        fail(
          400,
          "Enter the customer's name to track the remaining payment."
        );
      }

      const invoiceNumber = makeInvoiceNumber(shop.invoicePrefix || "INV");

      const [sale] = await Sale.create(
        [
          {
            shop: req.shop._id,
            invoiceNumber,
            items: saleItems,
            customerName: safeCustomerName,
            customerPhone: safeCustomerPhone,
            siteName: safeSiteName,
            subtotal,
            discount: safeDiscount,
            taxRate,
            taxAmount,
            total,
            paymentMethod,
            amountPaid: safePaid,
            balanceDue,
            paymentStatus,
            changeDue,
            cashier: req.user._id,
          },
        ],
        { session }
      );

      // Reduce stock and record movements inside the same transaction.
      for (const item of saleItems) {
        const previous = await Product.findOneAndUpdate(
          {
            _id: item.product,
            shop: req.shop._id,
            isActive: true,
            stockTrackingEnabled: true,
            currentStock: { $gte: item.quantity },
          },
          { $inc: { currentStock: -item.quantity } },
          { new: false, session, runValidators: true }
        );

        if (!previous) {
          fail(
            409,
            `Insufficient stock for ${item.name}. Refresh inventory and try again.`
          );
        }

        const newStock = roundMoney(
          previous.currentStock - item.quantity
        );

        await StockMovement.create(
          [
            {
              shop: req.shop._id,
              product: item.product,
              type: "out",
              quantity: item.quantity,
              previousStock: previous.currentStock,
              newStock,
              quantityDelta: -item.quantity,
              reason: "POS Sale",
              reference: invoiceNumber,
              createdBy: req.user._id,
            },
          ],
          { session }
        );
      }
      // Keep a ledger entry for the amount received at checkout.
if (safePaid > 0) {
  await Payment.create(
    [
      {
        shop: req.shop._id,
        sale: sale._id,
        invoiceNumber: sale.invoiceNumber,
        amount: Math.min(safePaid, total),
        method: paymentMethod,
        receivedBy: req.user._id,
        notes: "Payment received at checkout",
      },
    ],
    { session }
  );
}

      committedSale = sale;
    });

    return res.status(201).json({
      success: true,
      message:
        committedSale.balanceDue > 0
          ? "Sale completed with an outstanding balance."
          : "Sale completed successfully.",
      data: { sale: committedSale },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
}

export async function listSales(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = { shop: req.shop._id };

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);

      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { siteName: { $regex: search, $options: "i" } },
      ];
    }

    // Optional filter for the Remaining Payments page.
    if (req.query.paymentStatus) {
      const allowedStatuses = ["paid", "partial", "unpaid"];

      if (!allowedStatuses.includes(req.query.paymentStatus)) {
        fail(400, "Invalid payment status.");
      }

      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.remaining === "true") {
      filter.balanceDue = { $gt: 0 };
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};

      if (req.query.from) {
        const from = new Date(req.query.from);

        if (Number.isNaN(from.getTime())) {
          fail(400, "Invalid start date.");
        }

        filter.createdAt.$gte = from;
      }

      if (req.query.to) {
        const to = new Date(req.query.to);

        if (Number.isNaN(to.getTime())) {
          fail(400, "Invalid end date.");
        }

        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("cashier", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: sales,
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


export async function getSale(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID.",
      });
    }

    const sale = await Sale.findOne({
      _id: req.params.id,
      shop: req.shop._id,
    }).populate("cashier", "name");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    const payments = await Payment.find({
      shop: req.shop._id,
      sale: sale._id,
    })
      .populate("receivedBy", "name")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      data: {
        sale: {
          ...sale.toObject(),
          payments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}





export async function markSaleAsPaid(req, res, next) {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      shop: req.shop._id,
    });

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID.",
      });
    }

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    const remaining = roundMoney(
      Math.max(0, sale.total - sale.amountPaid)
    );

    if (remaining <= 0) {
      return res.json({
        success: true,
        message: "This sale is already fully paid.",
        data: { sale },
      });
    }

    // Record the outstanding balance through the normal payment endpoint.
    req.body = {
      amount: remaining,
      method: req.body?.method || "cash",
      notes: "Remaining balance settled",
    };

    return recordSalePayment(req, res, next);
  } catch (error) {
    next(error);
  }
}

export async function recordSalePayment(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { amount, method = "cash", notes = "" } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      fail(400, "Invalid sale ID.");
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      fail(400, "Enter a valid payment amount greater than zero.");
    }

    if (
      !["cash", "card", "bank_transfer", "mobile_wallet"].includes(method)
    ) {
      fail(400, "Select a valid payment method.");
    }

    if (typeof notes !== "string" || notes.length > 500) {
      fail(400, "Payment notes must be text with a maximum of 500 characters.");
    }

    let updatedSale;
    let payment;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: req.params.id,
        shop: req.shop._id,
      }).session(session);

      if (!sale) {
        fail(404, "Sale not found.");
      }

      const balance = roundMoney(
        Math.max(0, sale.total - sale.amountPaid)
      );

      if (balance <= 0) {
        fail(400, "This sale is already fully paid.");
      }

      const safeAmount = roundMoney(paymentAmount);

      if (safeAmount > balance) {
        fail(
          400,
          `Payment cannot exceed the remaining balance of Rs. ${balance.toFixed(2)}.`
        );
      }

      payment = (
        await Payment.create(
          [
            {
              shop: req.shop._id,
              sale: sale._id,
              invoiceNumber: sale.invoiceNumber,
              amount: safeAmount,
              method,
              receivedBy: req.user._id,
              notes: notes.trim(),
            },
          ],
          { session }
        )
      )[0];

      sale.amountPaid = roundMoney(sale.amountPaid + safeAmount);
      sale.balanceDue = roundMoney(
        Math.max(0, sale.total - sale.amountPaid)
      );

      sale.paymentStatus =
        sale.balanceDue <= 0
          ? "paid"
          : sale.amountPaid > 0
            ? "partial"
            : "unpaid";

      // A later payment does not create cash change on the old invoice.
      await sale.save({ session });

      updatedSale = sale;
    });

    return res.status(201).json({
      success: true,
      message:
        updatedSale.balanceDue <= 0
          ? "Payment recorded. The invoice is fully paid."
          : "Payment recorded successfully.",
      data: {
        payment,
        sale: updatedSale,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
}

