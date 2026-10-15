
import Category from "../models/Category.js";

function errorResponse(res, status, message) {
  return res.status(status).json({ success: false, message });
}

export async function listCategories(req, res, next) {
  try {
    const categories = await Category.find({
      shop: req.shop._id,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    if (!name || name.length > 80 || description.length > 500) {
      return errorResponse(
        res,
        400,
        "Enter a category name of up to 80 characters and a description of up to 500 characters."
      );
    }

    const category = await Category.create({
      shop: req.shop._id,
      name,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(
        res,
        409,
        "A category with this name already exists."
      );
    }

    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const updates = {};

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return errorResponse(res, 400, "Category name must be text.");
      }

      const name = req.body.name.trim();

      if (!name || name.length > 80) {
        return errorResponse(res, 400, "Enter a valid category name.");
      }

      updates.name = name;
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        req.body.description.length > 500
      ) {
        return errorResponse(res, 400, "Invalid category description.");
      }

      updates.description = req.body.description.trim();
    }

    if (!Object.keys(updates).length) {
      return errorResponse(res, 400, "No category changes were provided.");
    }

    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        shop: req.shop._id,
        isActive: true,
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      return errorResponse(res, 404, "Category not found.");
    }

    return res.json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 409, "That category name is already in use.");
    }

    if (error.name === "CastError") {
      return errorResponse(res, 400, "Invalid category ID.");
    }

    next(error);
  }
}

export async function archiveCategory(req, res, next) {
  try {
    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        shop: req.shop._id,
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!category) {
      return errorResponse(res, 404, "Active category not found.");
    }

    return res.json({
      success: true,
      message: "Category archived. Existing products have not been deleted.",
      data: category,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return errorResponse(res, 400, "Invalid category ID.");
    }

    next(error);
  }
}
