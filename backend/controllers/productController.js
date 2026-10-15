
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const allowedUnits = [
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
];

const allowedImageSources = [
  "",
  "manual",
  "wikimedia",
  "openverse",
  "upload",
];

const editableFields = [
  "name",
  "sku",
  "barcode",
  "category",
  "brand",
  "description",
  "purchasePrice",
  "salePrice",
  "wholesalePrice",
  "unit",
  "lowStockThreshold",
  "stockTrackingEnabled",
  "image",
];

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function cleanOptionalString(value) {
  if (value === undefined || value === null) return undefined;

  const result = String(value).trim();
  return result || undefined;
}

function isValidHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return value === "";
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function validateCategory(categoryId, shopId) {
  if (
    categoryId === undefined ||
    categoryId === null ||
    categoryId === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  if (!mongoose.isValidObjectId(categoryId)) {
    return { valid: false };
  }

  const category = await Category.findOne({
    _id: categoryId,
    shop: shopId,
    isActive: true,
  }).select("_id");

  return category
    ? { valid: true, value: category._id }
    : { valid: false };
}


function validateImage(image) {
  const errors = [];

  if (
    image === null ||
    typeof image !== "object" ||
    Array.isArray(image)
  ) {
    return {
      valid: false,
      errors: ["Product image must be a valid object."],
    };
  }

  const allowedFields = [
    "url",
    "originalUrl",
    "source",
    "sourcePageUrl",
    "license",
    "licenseVersion",
    "licenseUrl",
    "attribution",
  ];

  for (const key of Object.keys(image)) {
    if (!allowedFields.includes(key)) {
      errors.push(`Unsupported image field: ${key}.`);
    }
  }

  for (const key of allowedFields) {
    if (
      image[key] !== undefined &&
      typeof image[key] !== "string"
    ) {
      errors.push(`Image ${key} must be text.`);
    }
  }

  const limits = {
    url: 2000,
    originalUrl: 2000,
    source: 20,
    sourcePageUrl: 2000,
    license: 300,
    licenseVersion: 50,
    licenseUrl: 2000,
    attribution: 500,
  };

  for (const [key, maxLength] of Object.entries(limits)) {
    if (
      typeof image[key] === "string" &&
      image[key].length > maxLength
    ) {
      errors.push(
        `Image ${key} cannot exceed ${maxLength} characters.`
      );
    }
  }

  for (const key of ["url", "originalUrl", "sourcePageUrl", "licenseUrl"]) {
    if (
      image[key] !== undefined &&
      image[key] !== "" &&
      !isValidHttpsUrl(image[key])
    ) {
      errors.push(`Image ${key} must be a valid HTTPS URL.`);
    }
  }

  if (
    image.source !== undefined &&
    !allowedImageSources.includes(image.source)
  ) {
    errors.push("Unsupported image source.");
  }

  if (errors.length) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
    value: {
      url: image.url || "",
      originalUrl: image.originalUrl || "",
      source: image.source || "",
      sourcePageUrl: image.sourcePageUrl || "",
      license: image.license || "",
      licenseVersion: image.licenseVersion || "",
      licenseUrl: image.licenseUrl || "",
      attribution: image.attribution || "",
    },
  };
}


function validateProductFields(body, creating) {
  const errors = [];
  const data = {};

  for (const field of editableFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (creating && !String(data.name || "").trim()) {
    errors.push("Product name is required.");
  }

  if (
    data.name !== undefined &&
    (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.trim().length > 200
    )
  ) {
    errors.push(
      "Enter a valid product name of up to 200 characters."
    );
  }

  for (const field of [
    "purchasePrice",
    "salePrice",
    "wholesalePrice",
  ]) {
    if (data[field] === undefined) {
      if (creating && field !== "wholesalePrice") {
        errors.push(`${field} is required.`);
      }

      continue;
    }

    if (
      data[field] === null &&
      field === "wholesalePrice"
    ) {
      continue;
    }

    if (
      typeof data[field] !== "number" ||
      !Number.isFinite(data[field]) ||
      data[field] < 0
    ) {
      errors.push(
        `${field} must be a non-negative number.`
      );
    }
  }

  if (
    data.unit !== undefined &&
    !allowedUnits.includes(data.unit)
  ) {
    errors.push("Select a supported unit.");
  }

  if (data.lowStockThreshold !== undefined) {
    if (
      typeof data.lowStockThreshold !== "number" ||
      !Number.isFinite(data.lowStockThreshold) ||
      data.lowStockThreshold < 0
    ) {
      errors.push(
        "Low-stock threshold must be a non-negative number."
      );
    }
  }

  if (
    data.stockTrackingEnabled !== undefined &&
    typeof data.stockTrackingEnabled !== "boolean"
  ) {
    errors.push("Stock tracking must be true or false.");
  }

  for (const field of ["brand", "description"]) {
    if (
      data[field] !== undefined &&
      typeof data[field] !== "string"
    ) {
      errors.push(`${field} must be text.`);
    }
  }

  if (
    data.brand !== undefined &&
    data.brand.length > 100
  ) {
    errors.push("Brand cannot exceed 100 characters.");
  }

  if (
    data.description !== undefined &&
    data.description.length > 2000
  ) {
    errors.push("Description cannot exceed 2000 characters.");
  }

  if (data.sku !== undefined) {
    if (
      typeof data.sku !== "string" ||
      data.sku.length > 64
    ) {
      errors.push("SKU must be text of up to 64 characters.");
    }
  }

  if (data.barcode !== undefined) {
    if (
      typeof data.barcode !== "string" ||
      data.barcode.length > 100
    ) {
      errors.push(
        "Barcode must be text of up to 100 characters."
      );
    }
  }

  if (data.category !== undefined) {
    if (
      data.category !== null &&
      typeof data.category !== "string" &&
      !mongoose.isValidObjectId(data.category)
    ) {
      errors.push("Invalid category value.");
    }
  }

  if (data.image !== undefined) {
    const result = validateImage(data.image);

    if (!result.valid) {
      errors.push(...result.errors);
    } else {
      data.image = result.value;
    }
  }

  return {
    data,
    errors,
  };
}

export async function createProduct(req, res, next) {
  try {
    const { data, errors } = validateProductFields(
      req.body,
      true
    );

    if (errors.length) {
      return fail(res, 400, errors.join(" "));
    }

    // Stock quantities must be initialized through the
    // dedicated inventory workflow.
    if (
      "currentStock" in req.body ||
      "openingStock" in req.body
    ) {
      return fail(
        res,
        400,
        "Stock must be initialized through the inventory adjustment workflow."
      );
    }

    data.name = data.name.trim();

    if (data.sku !== undefined) {
      data.sku = cleanOptionalString(data.sku)?.toUpperCase();
    }

    if (data.barcode !== undefined) {
      data.barcode = cleanOptionalString(data.barcode);
    }

    if (data.category !== undefined) {
      const result = await validateCategory(
        data.category,
        req.shop._id
      );

      if (!result.valid) {
        return fail(
          res,
          400,
          "The selected category is invalid."
        );
      }

      data.category = result.value;
    }

    const product = await Product.create({
      ...data,
      shop: req.shop._id,
      currentStock: null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message:
        "Product created. Opening stock has not been set.",
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "That SKU or barcode is already in use."
      );
    }

    next(error);
  }
}

export async function listProducts(req, res, next) {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 20
      )
    );

    const filter = {
      shop: req.shop._id,
    };

    filter.isActive =
      req.query.archived === "true" ? false : true;

    if (req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) {
        return fail(res, 400, "Invalid category filter.");
      }

      filter.category = req.query.category;
    }

    if (req.query.stockStatus) {
      if (
        !["known", "unknown", "low", "out"].includes(
          req.query.stockStatus
        )
      ) {
        return fail(res, 400, "Invalid stock status filter.");
      }

      if (req.query.stockStatus === "unknown") {
        filter.currentStock = null;
      } else if (req.query.stockStatus === "known") {
        filter.currentStock = { $ne: null };
      } else if (req.query.stockStatus === "out") {
        filter.currentStock = 0;
      } else {
        filter.$expr = {
          $and: [
            { $ne: ["$currentStock", null] },
            { $gt: ["$currentStock", 0] },
            {
              $lte: [
                "$currentStock",
                "$lowStockThreshold",
              ],
            },
          ],
        };
      }
    }

    const search = String(
      req.query.search || ""
    ).trim();

    if (search) {
      const safeSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(safeSearch, "i");

      filter.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex },
        { brand: regex },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
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

export async function getProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid product ID.");
    }

    const product = await Product.findOne({
      _id: req.params.id,
      shop: req.shop._id,
    }).populate("category", "name");

    if (!product) {
      return fail(res, 404, "Product not found.");
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    if (
      "currentStock" in req.body ||
      "openingStock" in req.body ||
      "shop" in req.body ||
      "createdBy" in req.body ||
      "updatedBy" in req.body ||
      "isActive" in req.body ||
      "archivedAt" in req.body
    ) {
      return fail(
        res,
        400,
        "Stock, shop ownership, and archive status must be changed through their dedicated workflows."
      );
    }

    const { data, errors } = validateProductFields(
      req.body,
      false
    );

    if (errors.length) {
      return fail(res, 400, errors.join(" "));
    }

    if (!Object.keys(data).length) {
      return fail(
        res,
        400,
        "No editable product fields were supplied."
      );
    }

    if (data.name !== undefined) {
      data.name = data.name.trim();
    }

    if (data.sku !== undefined) {
      data.sku = cleanOptionalString(data.sku)?.toUpperCase();
    }

    if (data.barcode !== undefined) {
      data.barcode = cleanOptionalString(data.barcode);
    }

    if (data.category !== undefined) {
      const result = await validateCategory(
        data.category,
        req.shop._id
      );

      if (!result.valid) {
        return fail(
          res,
          400,
          "The selected category is invalid."
        );
      }

      data.category = result.value;
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid product ID.");
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        shop: req.shop._id,
        isActive: true,
      },
      {
        $set: {
          ...data,
          updatedBy: req.user._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("category", "name");

    if (!product) {
      return fail(res, 404, "Active product not found.");
    }

    return res.json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(
        res,
        409,
        "That SKU or barcode is already in use."
      );
    }

    if (error.name === "CastError") {
      return fail(
        res,
        400,
        "Invalid product ID or field value."
      );
    }

    next(error);
  }
}

export async function archiveProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid product ID.");
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        shop: req.shop._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          archivedAt: new Date(),
          updatedBy: req.user._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return fail(res, 404, "Active product not found.");
    }

    return res.json({
      success: true,
      message: "Product archived successfully.",
      data: product,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return fail(res, 400, "Invalid product ID.");
    }

    next(error);
  }
}

export async function bulkImportProducts(req, res, next) {
  try {
    const rows = req.body?.products;

    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(res, 400, "Provide at least one product to import.");
    }

    if (rows.length > 500) {
      return fail(res, 400, "Import a maximum of 500 products at a time.");
    }

    const shopId = req.shop._id;
    const results = [];
    const seenSkus = new Set();
    const seenBarcodes = new Set();

    // Resolve category names once for this shop.
    const categories = await Category.find({
      shop: shopId,
      isActive: true,
    }).select("_id name");

    const categoryMap = new Map(
      categories.map((category) => [
        category.name.trim().toLowerCase(),
        category._id,
      ])
    );

    // Preload existing identifiers belonging to this shop.
    const existingProducts = await Product.find({
      shop: shopId,
      isActive: true,
    }).select("sku barcode");

    const existingSkus = new Set(
      existingProducts
        .map((p) => String(p.sku || "").trim().toUpperCase())
        .filter(Boolean)
    );

    const existingBarcodes = new Set(
      existingProducts
        .map((p) => String(p.barcode || "").trim())
        .filter(Boolean)
    );

    const allowedImportFields = [
      "name",
      "sku",
      "barcode",
      "category",
      "brand",
      "description",
      "purchasePrice",
      "salePrice",
      "wholesalePrice",
      "unit",
      "lowStockThreshold",
      "stockTrackingEnabled",
    ];

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      const row = rows[index];

      if (!row || typeof row !== "object" || Array.isArray(row)) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: "Invalid spreadsheet row.",
        });
        continue;
      }

      const unexpectedFields = Object.keys(row).filter(
        (key) =>
          !allowedImportFields.includes(key) &&
          !["openingStock", "currentStock"].includes(key)
      );

      if ("openingStock" in row || "currentStock" in row) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: "Opening stock must be recorded through the inventory workflow.",
        });
        continue;
      }

      if (unexpectedFields.length) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: `Unsupported fields: ${unexpectedFields.join(", ")}`,
        });
        continue;
      }

      const input = { ...row };

      // Convert supported spreadsheet text/numbers into the types
      // required by the existing product validation.
      for (const field of [
        "purchasePrice",
        "salePrice",
        "wholesalePrice",
        "lowStockThreshold",
      ]) {
        if (
          input[field] !== undefined &&
          input[field] !== null &&
          input[field] !== ""
        ) {
          input[field] = Number(input[field]);
        }
      }

      if (input.stockTrackingEnabled !== undefined) {
        if (typeof input.stockTrackingEnabled === "string") {
          const value = input.stockTrackingEnabled.trim().toLowerCase();

          if (["true", "yes", "1"].includes(value)) {
            input.stockTrackingEnabled = true;
          } else if (["false", "no", "0"].includes(value)) {
            input.stockTrackingEnabled = false;
          } else {
            results.push({
              row: rowNumber,
              status: "failed",
              message: "stockTrackingEnabled must be true/false, yes/no, or 1/0.",
            });
            continue;
          }
        }
      }

      if (input.unit !== undefined) {
        input.unit = String(input.unit).trim().toLowerCase();
      }

      if (input.sku !== undefined) {
        input.sku = String(input.sku).trim().toUpperCase();
      }

      if (input.barcode !== undefined) {
        input.barcode = String(input.barcode).trim();
      }

      // Excel may provide a category name rather than a MongoDB ID.
      if (
        typeof input.category === "string" &&
        input.category.trim() &&
        !mongoose.isValidObjectId(input.category.trim())
      ) {
        const categoryId = categoryMap.get(
          input.category.trim().toLowerCase()
        );

        if (!categoryId) {
          results.push({
            row: rowNumber,
            status: "failed",
            message: `Category "${input.category}" was not found in this shop.`,
          });
          continue;
        }

        input.category = categoryId.toString();
      }

      const { data, errors } = validateProductFields(input, true);

      if (errors.length) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: errors.join(" "),
        });
        continue;
      }

      data.name = data.name.trim();

      if (data.sku !== undefined) {
        data.sku = cleanOptionalString(data.sku);
      }

      if (data.barcode !== undefined) {
        data.barcode = cleanOptionalString(data.barcode);
      }

      if (data.sku && (
        existingSkus.has(data.sku) || seenSkus.has(data.sku)
      )) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: `Duplicate SKU "${data.sku}".`,
        });
        continue;
      }

      if (data.barcode && (
        existingBarcodes.has(data.barcode) ||
        seenBarcodes.has(data.barcode)
      )) {
        results.push({
          row: rowNumber,
          status: "failed",
          message: `Duplicate barcode "${data.barcode}".`,
        });
        continue;
      }

      if (data.category !== undefined) {
        const categoryResult = await validateCategory(
          data.category,
          shopId
        );

        if (!categoryResult.valid) {
          results.push({
            row: rowNumber,
            status: "failed",
            message: "The selected category is invalid.",
          });
          continue;
        }

        data.category = categoryResult.value;
      }

      try {
        const product = await Product.create({
          ...data,
          shop: shopId,
          currentStock: null,
          createdBy: req.user._id,
          updatedBy: req.user._id,
        });

        if (product.sku) {
          existingSkus.add(product.sku);
          seenSkus.add(product.sku);
        }

        if (product.barcode) {
          existingBarcodes.add(product.barcode);
          seenBarcodes.add(product.barcode);
        }

        results.push({
          row: rowNumber,
          status: "imported",
          name: product.name,
        });
      } catch (error) {
        if (error.code === 11000) {
          results.push({
            row: rowNumber,
            status: "failed",
            message: "SKU or barcode already exists.",
          });
          continue;
        }

        throw error;
      }
    }

    const imported = results.filter(
      (result) => result.status === "imported"
    ).length;

    const failed = results.length - imported;

    return res.status(200).json({
      success: true,
      message: `Imported ${imported} products; ${failed} row(s) failed.`,
      data: {
        imported,
        failed,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
}
