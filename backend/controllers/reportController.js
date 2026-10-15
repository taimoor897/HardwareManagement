
import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Expense from "../models/Expense.js";

const getShopId = (req) => req.user?.shopId || req.user?.shop;

function getDateRange(query) {
  const start = query.startDate
    ? new Date(`${query.startDate}T00:00:00+05:00`)
    : null;

  const end = query.endDate
    ? new Date(`${query.endDate}T23:59:59.999+05:00`)
    : null;

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

function dateFilter(field, { start, end }) {
  if (!start && !end) return {};

  const filter = {};
  if (start) filter.$gte = start;
  if (end) filter.$lte = end;

  return { [field]: filter };
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function serverError(res, error) {
  if (
    ["Invalid start date", "Invalid end date",
      "Start date cannot be after end date"].includes(error.message)
  ) {
    return badRequest(res, error.message);
  }

  console.error("Report error:", error);
  return res.status(500).json({
    success: false,
    message: "Unable to generate this report",
  });
}

function summarizeSales(sales) {
  let grossSales = 0;
  let discounts = 0;
  let netSales = 0;
  let costOfGoodsSold = 0;
  let taxCollected = 0;
  let itemsSold = 0;

  for (const sale of sales) {
    const subtotal = Number(sale.subtotal) || 0;
    const discount = Number(sale.discount) || 0;

    grossSales += subtotal;
    discounts += discount;
    netSales += subtotal - discount;
    taxCollected += Number(sale.taxAmount) || 0;

    for (const item of sale.items || []) {
      const quantity = Number(item.quantity) || 0;
      const cost = Number(item.purchasePrice) || 0;

      itemsSold += quantity;
      costOfGoodsSold += quantity * cost;
    }
  }

  return {
    grossSales,
    discounts,
    netSales,
    costOfGoodsSold,
    grossProfit: netSales - costOfGoodsSold,
    taxCollected,
    itemsSold,
    salesCount: sales.length,
    averageSale: sales.length ? netSales / sales.length : 0,
  };
}

export async function getReportOverview(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop || !mongoose.isValidObjectId(shop)) {
      return badRequest(res, "A valid shop account is required");
    }

    const range = getDateRange(req.query);
    const salesFilter = {
      shop,
      ...dateFilter("createdAt", range),
    };
    const expenseFilter = {
      shop,
      ...dateFilter("expenseDate", range),
    };

    const [sales, expenses, products] = await Promise.all([
      Sale.find(salesFilter)
        .select(
          "subtotal discount taxAmount total paymentMethod items createdAt invoiceNumber customerName"
        )
        .sort({ createdAt: 1 })
        .lean(),
      Expense.find(expenseFilter)
        .select("amount category expenseDate")
        .lean(),
      Product.find({ shop, isActive: true })
        .select("name SKU sku currentStock lowStockThreshold purchasePrice salePrice category")
        .lean(),
    ]);

    const summary = summarizeSales(sales);
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0
    );

    const stockProducts = products.filter(
      (product) => product.currentStock !== null &&
        product.currentStock !== undefined
    );

    const inventoryCostValue = stockProducts.reduce(
      (sum, product) =>
        sum +
        (Number(product.currentStock) || 0) *
          (Number(product.purchasePrice) || 0),
      0
    );

    const inventoryRetailValue = stockProducts.reduce(
      (sum, product) =>
        sum +
        (Number(product.currentStock) || 0) *
          (Number(product.salePrice) || 0),
      0
    );

    const lowStockProducts = stockProducts.filter((product) => {
      const threshold = Number(product.lowStockThreshold) || 0;
      return Number(product.currentStock) <= threshold;
    });

    const outOfStockProducts = stockProducts.filter(
      (product) => Number(product.currentStock) <= 0
    );

    const expensesByCategory = {};

    for (const expense of expenses) {
      const category = expense.category || "Other";
      expensesByCategory[category] =
        (expensesByCategory[category] || 0) +
        (Number(expense.amount) || 0);
    }

    return res.json({
      success: true,
      data: {
        ...summary,
        totalExpenses,
        operatingProfit: summary.grossProfit - totalExpenses,
        netMargin: summary.netSales > 0
          ? ((summary.grossProfit - totalExpenses) / summary.netSales) * 100
          : 0,
        expenseCount: expenses.length,
        inventory: {
          trackedProducts: stockProducts.length,
          untrackedProducts: products.length - stockProducts.length,
          inventoryCostValue,
          inventoryRetailValue,
          potentialMarkup: inventoryRetailValue - inventoryCostValue,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
        },
        expensesByCategory: Object.entries(expensesByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getSalesTrend(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop || !mongoose.isValidObjectId(shop)) {
      return badRequest(res, "A valid shop account is required");
    }

    const range = getDateRange(req.query);
    const sales = await Sale.find({
      shop,
      ...dateFilter("createdAt", range),
    })
      .select("subtotal discount items createdAt")
      .sort({ createdAt: 1 })
      .lean();

    const byDay = new Map();

    for (const sale of sales) {
      const date = new Date(sale.createdAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Karachi",
      });

      const existing = byDay.get(date) || {
        date,
        sales: 0,
        transactions: 0,
        cost: 0,
      };

      existing.sales +=
        (Number(sale.subtotal) || 0) - (Number(sale.discount) || 0);
      existing.transactions += 1;

      for (const item of sale.items || []) {
        existing.cost +=
          (Number(item.quantity) || 0) *
          (Number(item.purchasePrice) || 0);
      }

      byDay.set(date, existing);
    }

    return res.json({
      success: true,
      data: [...byDay.values()].map((day) => ({
        ...day,
        grossProfit: day.sales - day.cost,
      })),
    });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getTopProducts(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop || !mongoose.isValidObjectId(shop)) {
      return badRequest(res, "A valid shop account is required");
    }

    const range = getDateRange(req.query);
    const sales = await Sale.find({
      shop,
      ...dateFilter("createdAt", range),
    })
      .select("items")
      .lean();

    const products = new Map();

    for (const sale of sales) {
      for (const item of sale.items || []) {
        const id = String(item.product || item.productId || item.sku || item.name);
        const entry = products.get(id) || {
          key: id,
          name: item.name || "Unknown product",
          sku: item.sku || "",
          quantitySold: 0,
          revenue: 0,
          cost: 0,
        };

        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const unitCost = Number(item.purchasePrice) || 0;

        entry.quantitySold += quantity;
        entry.revenue += quantity * unitPrice;
        entry.cost += quantity * unitCost;

        products.set(id, entry);
      }
    }

    const result = [...products.values()]
      .map((product) => ({
        ...product,
        grossProfit: product.revenue - product.cost,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 20);

    return res.json({ success: true, data: result });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getPaymentBreakdown(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop || !mongoose.isValidObjectId(shop)) {
      return badRequest(res, "A valid shop account is required");
    }

    const range = getDateRange(req.query);
    const sales = await Sale.find({
      shop,
      ...dateFilter("createdAt", range),
    })
      .select("paymentMethod total")
      .lean();

    const methods = new Map();

    for (const sale of sales) {
      const method = sale.paymentMethod || "Other";
      const existing = methods.get(method) || {
        method,
        transactions: 0,
        amount: 0,
      };

      existing.transactions += 1;
      existing.amount += Number(sale.total) || 0;
      methods.set(method, existing);
    }

    return res.json({
      success: true,
      data: [...methods.values()].sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getInventoryReport(req, res) {
  try {
    const shop = getShopId(req);

    if (!shop || !mongoose.isValidObjectId(shop)) {
      return badRequest(res, "A valid shop account is required");
    }

    const products = await Product.find({ shop, isActive: true })
      .select("name SKU sku currentStock lowStockThreshold purchasePrice salePrice category unit")
      .sort({ name: 1 })
      .lean();

    const result = products.map((product) => {
      const tracked =
        product.currentStock !== null &&
        product.currentStock !== undefined;

      const stock = tracked ? Number(product.currentStock) || 0 : null;
      const threshold = Number(product.lowStockThreshold) || 0;

      return {
        _id: product._id,
        name: product.name,
        sku: product.SKU || product.sku || "",
        category: product.category || null,
        unit: product.unit || "piece",
        stockTracked: tracked,
        currentStock: stock,
        lowStockThreshold: threshold,
        purchasePrice: Number(product.purchasePrice) || 0,
        salePrice: Number(product.salePrice) || 0,
        stockCostValue: tracked
          ? stock * (Number(product.purchasePrice) || 0)
          : null,
        stockRetailValue: tracked
          ? stock * (Number(product.salePrice) || 0)
          : null,
        status: !tracked
          ? "Untracked"
          : stock <= 0
            ? "Out of stock"
            : stock <= threshold
              ? "Low stock"
              : "In stock",
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return serverError(res, error);
  }
}
