
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";

const VALID_UNITS = [
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

const HEADERS = [
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

const ALIASES = {
  name: [
    "name",
    "product",
    "productname",
    "item",
    "items",
    "itemname",
  ],
  sku: ["sku", "productcode", "itemcode", "code"],
  barcode: ["barcode", "barcodes"],
  category: ["category", "categoryname", "productcategory"],
  brand: ["brand", "manufacturer"],
  description: [
    "description",
    "specification",
    "specifications",
    "details",
  ],
  purchasePrice: [
    "purchaseprice",
    "purchaserate",
    "rateperchage",
    "ratepurchase",
    "purchase",
    "costprice",
    "buyingprice",
  ],
  salePrice: [
    "saleprice",
    "salerate",
    "sellingprice",
    "sellingrate",
    "retailprice",
    "rate",
  ],
  wholesalePrice: [
    "wholesaleprice",
    "contractorprice",
    "wholesalerate",
  ],
  unit: ["unit", "uom", "measurement"],
  lowStockThreshold: [
    "lowstockthreshold",
    "minimumstock",
    "reorderlevel",
  ],
  stockTrackingEnabled: [
    "stocktrackingenabled",
    "trackstock",
    "stocktracking",
  ],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function readValue(row, field) {
  const aliases = ALIASES[field] || [field];
  const key = Object.keys(row).find((candidate) =>
    aliases.includes(normalizeHeader(candidate))
  );

  return key === undefined ? "" : row[key];
}

function isBlank(value) {
  return (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function parsePrice(value) {
  if (isBlank(value)) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/PKR|Rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return null;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseBoolean(value, defaultValue = true) {
  if (isBlank(value)) return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "yes", "1", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function downloadTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    [
      "PVC Pipe 1 Inch",
      "PVC-001",
      "",
      "",
      "",
      "PVC pipe, 1 inch",
      150,
      200,
      180,
      "piece",
      5,
      true,
    ],
  ]);

  worksheet["!cols"] = HEADERS.map((header) => ({
    wch: Math.max(header.length + 3, 18),
  }));

  const instructions = XLSX.utils.aoa_to_sheet([
    ["HARDWARE SHOP - PRODUCT IMPORT"],
    ["Delete the example row before importing real products."],
    ["Required: product name, purchase price, and sale price."],
    ["Supported headings: Items, rate perchage, and sale rate."],
    ["Category is optional and must match an existing category."],
    ["Valid units: " + VALID_UNITS.join(", ")],
    ["Prices must be non-negative numbers. PKR signs are optional."],
    ["Opening stock is not imported."],
    ["SKU and barcode should be unique."],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");

  XLSX.writeFile(workbook, "HardwareShop_Product_Import_Template.xlsx");
}

function validateRow(source, rowNumber, categories) {
  const raw = {};

  for (const field of HEADERS) {
    raw[field] = readValue(source, field);
  }

  const errors = [];
  const name = String(raw.name ?? "").trim();
  const sku = String(raw.sku ?? "").trim().toUpperCase();
  const barcode = String(raw.barcode ?? "").trim();
  const brand = String(raw.brand ?? "").trim();
  const description = String(raw.description ?? "").trim();
  const unit = String(raw.unit || "piece").trim().toLowerCase();

  const purchasePrice = parsePrice(raw.purchasePrice);
  const salePrice = parsePrice(raw.salePrice);

  const wholesalePrice = isBlank(raw.wholesalePrice)
    ? null
    : parsePrice(raw.wholesalePrice);

  const lowStockThreshold = isBlank(raw.lowStockThreshold)
    ? 5
    : parsePrice(raw.lowStockThreshold);

  let categoryId = null;
  const categoryName = String(raw.category ?? "").trim();

  if (!name) errors.push("Product name is required.");

  if (name.length > 200) {
    errors.push("Name must be 200 characters or fewer.");
  }

  if (purchasePrice === null || purchasePrice < 0) {
    errors.push("Purchase price must be a valid non-negative number.");
  }

  if (salePrice === null || salePrice < 0) {
    errors.push("Sale price must be a valid non-negative number.");
  }

  if (
    !isBlank(raw.wholesalePrice) &&
    (wholesalePrice === null || wholesalePrice < 0)
  ) {
    errors.push("Wholesale price must be blank or a valid non-negative number.");
  }

  if (lowStockThreshold === null || lowStockThreshold < 0) {
    errors.push("Low-stock threshold must be a non-negative number.");
  }

  if (!VALID_UNITS.includes(unit)) {
    errors.push(`Invalid unit "${unit}".`);
  }

  if (categoryName) {
    const category = categories.find(
      (item) =>
        String(item.name || "").trim().toLowerCase() ===
        categoryName.toLowerCase()
    );

    if (!category) {
      errors.push(`Category "${categoryName}" does not exist.`);
    } else {
      categoryId = category._id;
    }
  }

  if (sku.length > 64) {
    errors.push("SKU must be 64 characters or fewer.");
  }

  if (barcode.length > 100) {
    errors.push("Barcode must be 100 characters or fewer.");
  }

  if (brand.length > 100) {
    errors.push("Brand must be 100 characters or fewer.");
  }

  if (description.length > 2000) {
    errors.push("Description is too long.");
  }

  return {
    rowNumber,
    product: {
      name,
      ...(sku ? { sku } : {}),
      ...(barcode ? { barcode } : {}),
      ...(categoryId ? { category: String(categoryId) } : {}),
      brand,
      description,
      purchasePrice,
      salePrice,
      wholesalePrice,
      unit,
      lowStockThreshold,
      stockTrackingEnabled: parseBoolean(
        raw.stockTrackingEnabled,
        true
      ),
    },
    errors,
    result: null,
  };
}

export default function BulkProductImport({
  categories = [],
  onClose,
  onImported,
}) {
  const fileRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      await Swal.fire(
        "Unsupported file",
        "Choose an .xlsx, .xls, or .csv file.",
        "warning"
      );
      return;
    }

    setReading(true);
    setRows([]);
    setSummary(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        throw new Error("The spreadsheet has no readable worksheet.");
      }

      const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });

      if (!matrix.length) {
        throw new Error("The worksheet is empty.");
      }

      // Find the row containing Items or another supported name header.
      const headerIndex = matrix.findIndex((line) => {
        const normalized = line.map(normalizeHeader);

        return normalized.some((header) =>
          ALIASES.name.includes(header)
        );
      });

      if (headerIndex === -1) {
        throw new Error(
          'Could not find a product-name column. Expected "Items" or "Product Name".'
        );
      }

      const headers = matrix[headerIndex].map((value) =>
        String(value ?? "").trim()
      );

      // Ensure that the two required price columns exist.
      const normalizedHeaders = headers.map(normalizeHeader);

      const hasPurchasePrice = normalizedHeaders.some((header) =>
        ALIASES.purchasePrice.includes(header)
      );

      const hasSalePrice = normalizedHeaders.some((header) =>
        ALIASES.salePrice.includes(header)
      );

      if (!hasPurchasePrice || !hasSalePrice) {
        throw new Error(
          'Could not identify both price columns. Expected "rate perchage" and "sale rate".'
        );
      }

      const rawRows = matrix.slice(headerIndex + 1).map((line, index) => {
        const row = {};

        headers.forEach((header, columnIndex) => {
          if (header) {
            row[header] = line[columnIndex] ?? "";
          }
        });

        return {
          row,
          rowNumber: headerIndex + index + 2,
        };
      });

      const parsed = rawRows
        .filter(({ row }) => {
          const name = String(readValue(row, "name") ?? "").trim();

          // Skip blank rows and category/section headings with no prices.
          if (!name) return false;

          const rawPurchase = readValue(row, "purchasePrice");
          const rawSale = readValue(row, "salePrice");

          return !(
            isBlank(rawPurchase) &&
            isBlank(rawSale)
          );
        })
        .map(({ row, rowNumber }) =>
          validateRow(row, rowNumber, categories)
        );

      if (!parsed.length) {
        throw new Error(
          "No product rows with prices were found. Check the spreadsheet data."
        );
      }

      if (parsed.length > 500) {
        throw new Error("Import up to 500 products at a time.");
      }

      // Detect duplicate identifiers within this spreadsheet.
      const skuRows = new Map();
      const barcodeRows = new Map();

      for (const row of parsed) {
        if (row.product.sku) {
          const key = row.product.sku.toUpperCase();

          if (skuRows.has(key)) {
            row.errors.push(
              `Duplicate SKU also appears on Excel row ${skuRows.get(key)}.`
            );
          } else {
            skuRows.set(key, row.rowNumber);
          }
        }

        if (row.product.barcode) {
          const key = row.product.barcode;

          if (barcodeRows.has(key)) {
            row.errors.push(
              `Duplicate barcode also appears on Excel row ${barcodeRows.get(key)}.`
            );
          } else {
            barcodeRows.set(key, row.rowNumber);
          }
        }
      }

      setRows(parsed);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Could not read spreadsheet",
        text: error.message || "Check the file and try again.",
      });
    } finally {
      setReading(false);
    }
  }

  async function importProducts() {
    const validRows = rows.filter((row) => row.errors.length === 0);

    if (!validRows.length) {
      await Swal.fire(
        "Nothing to import",
        "Fix the errors before importing.",
        "warning"
      );
      return;
    }

    const confirmation = await Swal.fire({
      title: `Import ${validRows.length} products?`,
      text: "Products will be created in your shop. Existing products will not be updated, and stock quantities will not be changed.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Import products",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    setImporting(true);

    try {
      // Do not send importRow: the backend rejects unexpected fields.
      const products = validRows.map((row) => ({
        ...row.product,
      }));

      const response = await api.post("/products/bulk-import", {
        products,
      });

      const data = response.data?.data || {};
      const results = Array.isArray(data.results) ? data.results : [];

      /*
       * Backend result rows are numbered from 2 in the submitted batch.
       * Map them back to their original Excel rows using validRows order.
       */
      const resultByExcelRow = new Map();

      validRows.forEach((row, index) => {
        const backendRowNumber = index + 2;

        const result = results.find(
          (item) => item.row === backendRowNumber
        );

        if (result) {
          resultByExcelRow.set(row.rowNumber, {
            ...result,
            success: result.status === "imported",
          });
        }
      });

      setRows((current) =>
        current.map((row) => {
          const result = resultByExcelRow.get(row.rowNumber);

          if (!result) return row;

          return {
            ...row,
            result,
            errors: result.success
              ? []
              : [result.message || "Import failed."],
          };
        })
      );

      const imported =
        typeof data.imported === "number"
          ? data.imported
          : results.filter((item) => item.status === "imported").length;

      const failed =
        typeof data.failed === "number"
          ? data.failed
          : results.filter((item) => item.status === "failed").length;

      setSummary({ imported, failed });

      if (imported > 0) {
        try {
          await onImported?.();
        } catch (refreshError) {
          console.error("Products imported, but list refresh failed:", refreshError);
        }
      }

      if (failed === 0) {
        await Swal.fire({
          icon: "success",
          title: "Import complete",
          text: `${imported} products imported successfully.`,
        });
      } else {
        await Swal.fire({
          icon: "warning",
          title: "Import partially completed",
          text: `${imported} imported; ${failed} failed. Review the rows below.`,
        });
      }
    } catch (error) {
      console.error(
        "Bulk product import error:",
        error.response?.data || error
      );

      await Swal.fire({
        icon: "error",
        title: "Import failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Check the backend bulk-import endpoint and try again.",
      });
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows.filter(
    (row) => row.errors.length === 0 && !row.result?.success
  ).length;

  const invalidCount = rows.filter(
    (row) => row.errors.length > 0
  ).length;

  const importedCount = rows.filter(
    (row) => row.result?.success
  ).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="my-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Import products from Excel
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Upload, preview, validate, and import products in bulk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close import"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Download size={18} className="text-blue-600" />
                1. Download the template
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Use the provided column names to reduce errors. Delete the
                example row before importing.
              </p>

              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
                Download Excel template
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Upload size={18} className="text-blue-600" />
                2. Select your spreadsheet
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Supports Excel and CSV files. Up to 500 products per import.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={reading || importing}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {reading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {reading ? "Reading file..." : "Choose Excel / CSV"}
              </button>

              {fileName && (
                <p className="mt-2 truncate text-xs text-slate-500">
                  {fileName}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <strong>Important:</strong> This import creates product records
            only. Opening stock is not imported or counted. Record quantities
            separately through your inventory workflow.
          </div>

          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">
                  Imported successfully
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {summary.imported}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-red-700">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-800">
                  {summary.failed}
                </p>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">
                    Spreadsheet preview
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {rows.length} rows · {validCount} ready · {invalidCount} with errors
                    {importedCount > 0 ? ` · ${importedCount} imported` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                    {validCount} valid
                  </span>
                  <span className="rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-700">
                    {invalidCount} need attention
                  </span>
                </div>
              </div>

              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Purchase</th>
                      <th className="px-4 py-3">Sale</th>
                      <th className="px-4 py-3">Status / validation</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.rowNumber}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {row.product.name || "Unnamed product"}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.product.sku || "—"}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.product.purchasePrice ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.product.salePrice ?? "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.result?.success ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 size={14} />
                              Imported
                            </span>
                          ) : row.errors.length ? (
                            <div className="flex items-start gap-1.5 text-xs text-red-700">
                              <AlertCircle
                                size={14}
                                className="mt-0.5 shrink-0"
                              />
                              <span>{row.errors.join(" ")}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 size={14} />
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Close
          </button>

          <button
            type="button"
            onClick={importProducts}
            disabled={importing || reading || validCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            {importing
              ? "Importing products..."
              : `Import ${validCount} valid products`}
          </button>
        </div>
      </div>
    </div>
  );
}
