
import mongoose from "mongoose";
import Customer from "../models/Customer.js";

const getShopId = (req) => req.user?.shopId || req.user?.shop;

const getUserId = (req) => req.user?._id || req.user?.id;

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

export const listCustomers = async (req, res, next) => {
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
    const type = String(req.query.type || "");

    const filter = { shop: shopId };

    if (status === "active") filter.isArchived = false;
    if (status === "archived") filter.isArchived = true;

    if (["individual", "business"].includes(type)) {
      filter.customerType = type;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: regex },
        { phone: regex },
        { alternatePhone: regex },
        { companyName: regex },
        { email: regex },
        { customerNumber: regex },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: customers,
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

export const getCustomer = async (req, res, next) => {
  try {
    const shopId = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid customer ID");
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      shop: shopId,
    }).lean();

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const shopId = getShopId(req);
    const userId = getUserId(req);

    if (!shopId || !userId) {
      return sendError(res, 401, "Authentication information is missing");
    }

    const {
      name,
      customerType,
      companyName,
      phone,
      alternatePhone,
      email,
      address,
      city,
      notes,
    } = req.body;

    if (!String(name || "").trim()) {
      return sendError(res, 400, "Customer name is required");
    }

    if (!String(phone || "").trim()) {
      return sendError(res, 400, "Phone number is required");
    }

    const normalizedType = customerType || "individual";

    if (!["individual", "business"].includes(normalizedType)) {
      return sendError(res, 400, "Invalid customer type");
    }

    const customer = await Customer.create({
      shop: shopId,
      name,
      customerType: normalizedType,
      companyName,
      phone,
      alternatePhone,
      email,
      address,
      city,
      notes,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const shopId = getShopId(req);
    const userId = getUserId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid customer ID");
    }

    const allowedFields = [
      "name",
      "customerType",
      "companyName",
      "phone",
      "alternatePhone",
      "email",
      "address",
      "city",
      "notes",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (
      updates.name !== undefined &&
      !String(updates.name || "").trim()
    ) {
      return sendError(res, 400, "Customer name is required");
    }

    if (
      updates.phone !== undefined &&
      !String(updates.phone || "").trim()
    ) {
      return sendError(res, 400, "Phone number is required");
    }

    if (
      updates.customerType !== undefined &&
      !["individual", "business"].includes(updates.customerType)
    ) {
      return sendError(res, 400, "Invalid customer type");
    }

    updates.updatedBy = userId;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shop: shopId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveCustomer = async (req, res, next) => {
  try {
    const shopId = getShopId(req);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid customer ID");
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shop: shopId },
      [{ $set: { isArchived: { $eq: ["$isArchived", false] } } }],
      { new: true }
    );

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    res.json({
      success: true,
      message: customer.isArchived
        ? "Customer archived successfully"
        : "Customer restored successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};
