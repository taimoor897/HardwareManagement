
import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import Sale from "../models/Sale.js";

const getShopId = (req) => req.user?.shopId || req.user?.shop;
const getUserId = (req) => req.user?._id || req.user?.id;

const categories = [
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
];

const paymentMethods = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Mobile Wallet",
  "Other",
];

function getDateRange(query) {
  let start;
  let end;

  // Date-only filters are interpreted in Pakistan Standard Time.
  if (query.startDate) {
    start = new Date(`${query.startDate}T00:00:00+05:00`);
  }

  if (query.endDate) {
    end = new Date(`${query.endDate}T23:59:59.999+05:00`);
  }

  if (start && Number.isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }

  if (end && Number.isNaN(end.getTime())) {
    throw new Error("Invalid end date");
  }

  if (start && end && start > end) {
    throw new Error("Start date cannot be after end date");
  }

  return { start, end };
}

function dateFilter(field, range) {
  const filter = {};

  if (range.start || range.end) {
    filter[field] = {};
    if (range.start) filter[field].$gte = range.start;
    if (range.end) filter[field].$lte = range.end;
  }

  return filter;
}

function errorResponse(res, error) {
  if (error.message === "Invalid start date" ||
      error.message === "Invalid end date" ||
      error.message === "Start date cannot be after end date") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Expense controller error:", error);
  return res.status(500).json({
    success: false,
    message: "Unable to process the financial request",
  });
}

export async function listExpenses(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Your account is not linked to a shop",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const { start, end } = getDateRange(req.query);
    const filter = {
      shop,
      ...dateFilter("expenseDate", { start, end }),
    };

    if (req.query.category && categories.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().slice(0, 100);
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { title: regex },
        { paidTo: regex },
        { reference: regex },
        { notes: regex },
      ];
    }

    const [expenses, total, totals] = await Promise.all([
      Expense.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totals: {
        amount: totals[0]?.totalAmount || 0,
        count: totals[0]?.count || 0,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function getProfitSummary(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Your account is not linked to a shop",
      });
    }

    if (!mongoose.isValidObjectId(shop)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop account",
      });
    }

    const { start, end } = getDateRange(req.query);

    const salesFilter = {
      shop,
      ...dateFilter("createdAt", { start, end }),
    };

    const expenseFilter = {
      shop,
      ...dateFilter("expenseDate", { start, end }),
    };

    const [sales, expenseTotals, expenseCategories] = await Promise.all([
      Sale.find(salesFilter)
        .select("subtotal discount taxAmount total items createdAt")
        .lean(),
      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        { $match: expenseFilter },
        {
          $group: {
            _id: "$category",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);

    let grossSales = 0;
    let discounts = 0;
    let netSales = 0;
    let costOfGoodsSold = 0;
    let taxCollected = 0;
    let transactionCount = 0;
    let itemsSold = 0;

    for (const sale of sales) {
      const subtotal = Number(sale.subtotal) || 0;
      const discount = Number(sale.discount) || 0;

      grossSales += subtotal;
      discounts += discount;
      netSales += subtotal - discount;
      taxCollected += Number(sale.taxAmount) || 0;
      transactionCount += 1;

      for (const item of sale.items || []) {
        const quantity = Number(item.quantity) || 0;
        const purchasePrice = Number(item.purchasePrice) || 0;

        costOfGoodsSold += quantity * purchasePrice;
        itemsSold += quantity;
      }
    }

    const grossProfit = netSales - costOfGoodsSold;
    const totalExpenses = expenseTotals[0]?.total || 0;
    const netProfit = grossProfit - totalExpenses;

    return res.json({
      success: true,
      data: {
        grossSales,
        discounts,
        netSales,
        costOfGoodsSold,
        grossProfit,
        totalExpenses,
        netProfit,
        taxCollected,
        transactionCount,
        itemsSold,
        expenseCount: expenseTotals[0]?.count || 0,
        averageSale: transactionCount
          ? netSales / transactionCount
          : 0,
        grossMargin: netSales > 0
          ? (grossProfit / netSales) * 100
          : 0,
        netMargin: netSales > 0
          ? (netProfit / netSales) * 100
          : 0,
        expensesByCategory: expenseCategories.map((item) => ({
          category: item._id,
          amount: item.amount,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function createExpense(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Your account is not linked to a shop",
      });
    }

    const {
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      paidTo,
      reference,
      notes,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter an amount greater than zero",
      });
    }

    if (category && !categories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense category",
      });
    }

    if (paymentMethod && !paymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const expense = await Expense.create({
      shop,
      title: title.trim(),
      category: category || "Other",
      amount: Number(amount),
      expenseDate: expenseDate || new Date(),
      paymentMethod: paymentMethod || "Cash",
      paidTo,
      reference,
      notes,
      createdBy: getUserId(req),
    });

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      data: expense,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function updateExpense(req, res) {
  try {
    const shop = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const allowed = [
      "title",
      "category",
      "amount",
      "expenseDate",
      "paymentMethod",
      "paidTo",
      "reference",
      "notes",
    ];

    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Expense title is required",
        });
      }
      updates.title = updates.title.trim();
    }

    if (
      updates.amount !== undefined &&
      (!Number.isFinite(Number(updates.amount)) ||
        Number(updates.amount) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter an amount greater than zero",
      });
    }

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    if (updates.category !== undefined &&
        !categories.includes(updates.category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense category",
      });
    }

    if (updates.paymentMethod !== undefined &&
        !paymentMethods.includes(updates.paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    updates.updatedBy = getUserId(req);

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, shop },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function deleteExpense(req, res) {
  try {
    const shop = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      shop,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
