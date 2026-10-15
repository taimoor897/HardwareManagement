
import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";

const getShopId = (req) => req.user?.shopId || req.user?.shop;
const getUserId = (req) => req.user?._id || req.user?.id;

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const editableFields = [
  "name",
  "companyName",
  "phone",
  "alternatePhone",
  "email",
  "address",
  "city",
  "suppliedCategories",
  "notes",
];

export const listSuppliers = async (req, res, next) => {
  try {
    const shopId = getShopId(req);

    if (!shopId) {
      return sendError(res, 401, "Shop information is missing");
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "active");

    const filter = { shop: shopId };

    if (status === "active") filter.isArchived = false;
    if (status === "archived") filter.isArchived = true;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: regex },
        { companyName: regex },
        { phone: regex },
        { alternatePhone: regex },
        { email: regex },
        { city: regex },
        { suppliedCategories: regex },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: suppliers,
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
};

export const getSupplier = async (req, res, next) => {
  try {
    const shopId = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid supplier ID");
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      shop: shopId,
    }).lean();

    if (!supplier) {
      return sendError(res, 404, "Supplier not found");
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const shopId = getShopId(req);
    const userId = getUserId(req);

    if (!shopId || !userId) {
      return sendError(res, 401, "Authentication information is missing");
    }

    const {
      name,
      companyName,
      phone,
      alternatePhone,
      email,
      address,
      city,
      suppliedCategories,
      notes,
    } = req.body;

    if (!String(name || "").trim()) {
      return sendError(res, 400, "Supplier name is required");
    }

    if (!String(phone || "").trim()) {
      return sendError(res, 400, "Phone number is required");
    }

    if (
      suppliedCategories !== undefined &&
      (!Array.isArray(suppliedCategories) ||
        !suppliedCategories.every((item) => typeof item === "string"))
    ) {
      return sendError(res, 400, "Supplier categories must be a list of text values");
    }

    const supplier = await Supplier.create({
      shop: shopId,
      name,
      companyName,
      phone,
      alternatePhone,
      email,
      address,
      city,
      suppliedCategories,
      notes,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const shopId = getShopId(req);
    const userId = getUserId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid supplier ID");
    }

    const updates = {};

    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (
      updates.name !== undefined &&
      !String(updates.name || "").trim()
    ) {
      return sendError(res, 400, "Supplier name is required");
    }

    if (
      updates.phone !== undefined &&
      !String(updates.phone || "").trim()
    ) {
      return sendError(res, 400, "Phone number is required");
    }

    if (
      updates.suppliedCategories !== undefined &&
      (!Array.isArray(updates.suppliedCategories) ||
        !updates.suppliedCategories.every((item) => typeof item === "string"))
    ) {
      return sendError(res, 400, "Supplier categories must be a list of text values");
    }

    updates.updatedBy = userId;

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shop: shopId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return sendError(res, 404, "Supplier not found");
    }

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveSupplier = async (req, res, next) => {
  try {
    const shopId = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid supplier ID");
    }

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shop: shopId },
      [{ $set: { isArchived: { $eq: ["$isArchived", false] } } }],
      { new: true }
    );

    if (!supplier) {
      return sendError(res, 404, "Supplier not found");
    }

    res.json({
      success: true,
      message: supplier.isArchived
        ? "Supplier archived successfully"
        : "Supplier restored successfully",
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};
