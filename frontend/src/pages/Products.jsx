
import { useCallback, useEffect, useState } from "react";
import BulkProductImport from "./BulkProductImport";

import {
  Plus,
  Search,
  Package,
  Pencil,
  Archive,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Boxes,
  CircleAlert,
  Image as ImageIcon,
  ImagePlus,
  ExternalLink,
  Check,
  LoaderCircle,
  Link2,
  SearchX,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyImage = {
  url: "",
  originalUrl: "",
  source: "",
  sourcePageUrl: "",
  license: "",
  licenseVersion: "",
  licenseUrl: "",
  attribution: "",
};

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  brand: "",
  description: "",
  purchasePrice: "",
  salePrice: "",
  wholesalePrice: "",
  unit: "piece",
  lowStockThreshold: "5",
  stockTrackingEnabled: true,
  image: { ...emptyImage },
};

const units = [
  ["piece", "Piece"],
  ["box", "Box"],
  ["packet", "Packet"],
  ["bag", "Bag"],
  ["meter", "Meter"],
  ["foot", "Foot"],
  ["liter", "Liter"],
  ["kilogram", "Kilogram"],
  ["gram", "Gram"],
  ["roll", "Roll"],
  ["set", "Set"],
  ["dozen", "Dozen"],
  ["other", "Other"],
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";

function money(value) {
  if (value === null || value === undefined || value === "") return "—";

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(value);
}

function stockLabel(product) {
  if (!product.stockTrackingEnabled || product.currentStock == null) {
    return {
      label: "Not counted",
      style: "bg-slate-100 text-slate-600",
    };
  }

  if (product.currentStock === 0) {
    return {
      label: "Out of stock",
      style: "bg-red-50 text-red-700",
    };
  }

  if (product.currentStock <= product.lowStockThreshold) {
    return {
      label: "Low stock",
      style: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "In stock",
    style: "bg-emerald-50 text-emerald-700",
  };
}

function Field({ label, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function ProductImage({ image, name, size = "normal" }) {
  const [failed, setFailed] = useState(false);
  const url = typeof image === "string" ? image : image?.url;

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const dimensions =
    size === "small" ? "h-11 w-11 rounded-lg" : "h-14 w-14 rounded-xl";

  if (!url || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-slate-400 ${dimensions}`}
        title="No product image"
      >
        <Package size={size === "small" ? 19 : 23} />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden border border-slate-200 bg-white ${dimensions}`}
    >
      <img
        src={url}
        alt={name || "Product"}
        className="h-full w-full object-contain p-1"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function getSearchResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.images)) return data.images;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.images)) return data.data.images;

  return [];
}

function normalizeImageResult(result) {
  return {
    url:
      result.thumbnail ||
      result.thumbnailUrl ||
      result.url ||
      result.imageUrl ||
      result.thumb ||
      "",
    originalUrl:
      result.originalUrl ||
      result.imageUrl ||
      result.url ||
      "",
    source: result.source || "openverse",
    sourcePageUrl:
      result.sourcePageUrl ||
      result.foreign_landing_url ||
      result.detail_url ||
      result.pageUrl ||
      result.descriptionUrl ||
      result.urlPage ||
      "",
    license:
      result.license ||
      result.licenseShortName ||
      result.licenseName ||
      "",
    licenseVersion:
      result.licenseVersion ||
      result.license_version ||
      "",
    licenseUrl:
      result.licenseUrl ||
      result.license_url ||
      "",
    attribution:
      result.attribution ||
      result.artist ||
      result.author ||
      result.credit ||
      "",
  };
}

function ImagePicker({ image, onChange, productName }) {
  const [query, setQuery] = useState(productName || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mode, setMode] = useState("search");
  const [manualUrl, setManualUrl] = useState(image?.url || "");
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  useEffect(() => {
    setManualUrl(image?.url || "");
  }, [image?.url]);

  useEffect(() => {
    if (productName && !query) {
      setQuery(productName);
    }
  }, [productName, query]);

  async function searchImages() {
    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
      setSearchError("Enter a product name to search for images.");
      return;
    }

    setSearching(true);
    setSearched(false);
    setSearchError("");
    setResults([]);
    setImageLoadErrors({});

    try {
      const response = await api.get("/product-images/search", {
        params: { query: cleanQuery },
      });

      const rawResults = getSearchResults(response.data);

      const normalizedResults = rawResults
        .map(normalizeImageResult)
        .filter((item) => item.url);

      setResults(normalizedResults);
      setSearched(true);

      if (normalizedResults.length === 0) {
        setSearchError(
          `No suitable images were returned for "${cleanQuery}". Try a simpler product name.`
        );
      }
    } catch (error) {
      console.error(
        "Product image search failed:",
        error.response?.data || error
      );

      setSearchError(
        error.response?.data?.message ||
          "Image search failed. Check that your backend is running and the Openverse image-search route is configured."
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseImage(result) {
    if (!result.url) return;

    onChange({
      ...emptyImage,
      ...result,
      source: result.source || "openverse",
    });

    setManualUrl(result.url);
    setSearchError("");
  }

  function useManualUrl() {
    const url = manualUrl.trim();

    if (!url) {
      setSearchError("Enter an image URL first.");
      return;
    }

    try {
      const parsed = new URL(url);

      if (parsed.protocol !== "https:") {
        setSearchError("Please use an HTTPS image URL.");
        return;
      }
    } catch {
      setSearchError("Enter a valid image URL.");
      return;
    }

    onChange({
      ...emptyImage,
      url,
      originalUrl: url,
      source: "manual",
    });

    setSearchError("");
  }

  function removeImage() {
    onChange({ ...emptyImage });
    setManualUrl("");
    setSearchError("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("search");
            setSearchError("");
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
            mode === "search"
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Search size={15} />
          Free image search
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setSearchError("");
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
            mode === "manual"
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Link2 size={15} />
          Image URL
        </button>
      </div>

      {image?.url && (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-white">
            <img
              src={image.url}
              alt={productName || "Selected product"}
              className="h-full w-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <Check size={16} />
              Image selected
            </div>

            <p className="mt-1 truncate text-xs text-slate-600">
              {image.attribution || image.url}
            </p>

            {image.license && (
              <p className="mt-1 text-[11px] text-slate-500">
                License: {image.license}
                {image.licenseVersion ? ` ${image.licenseVersion}` : ""}
              </p>
            )}

            {image.sourcePageUrl && (
              <a
                href={image.sourcePageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
              >
                View source
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={removeImage}
            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
            title="Remove image"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {mode === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchImages();
                  }
                }}
                placeholder="e.g. PVC elbow pipe fitting"
                className={`${inputClass} pl-10`}
              />
            </div>

            <button
              type="button"
              onClick={searchImages}
              disabled={searching}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            Searches Openverse for openly licensed images. Results may not
            always depict the exact product. Review the image and its license
            before using it commercially.
          </p>

          {searchError && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
            >
              {searchError}
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
              <LoaderCircle size={19} className="animate-spin" />
              Searching available images...
            </div>
          )}

          {!searching && searched && results.length > 0 && (
            <>
              <p className="text-xs text-slate-500">
                {results.length} results. Select the image that best matches
                your product.
              </p>

              <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {results.map((result, index) => {
                  const selected =
                    image?.url === result.url &&
                    image?.sourcePageUrl === result.sourcePageUrl;

                  return (
                    <button
                      key={`${result.url}-${index}`}
                      type="button"
                      onClick={() => chooseImage(result)}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        selected
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="relative flex h-28 items-center justify-center bg-slate-50">
                        {imageLoadErrors[index] ? (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <SearchX size={21} />
                            <span className="text-[10px]">
                              Preview unavailable
                            </span>
                          </div>
                        ) : (
                          <img
                            src={result.url}
                            alt={result.attribution || "Search result"}
                            className="h-full w-full object-contain p-2"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setImageLoadErrors((current) => ({
                                ...current,
                                [index]: true,
                              }))
                            }
                          />
                        )}

                        {selected && (
                          <span className="absolute right-2 top-2 rounded-full bg-blue-600 p-1 text-white">
                            <Check size={13} />
                          </span>
                        )}

                        {!selected && (
                          <span className="absolute inset-0 flex items-center justify-center bg-blue-600/0 text-white transition group-hover:bg-blue-600/10">
                            <ImagePlus
                              size={22}
                              className="opacity-0 group-hover:opacity-100"
                            />
                          </span>
                        )}
                      </div>

                      <div className="border-t border-slate-100 p-2.5">
                        <p className="truncate text-[11px] font-semibold text-slate-700">
                          {result.attribution || "Openverse image"}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-slate-500">
                          {result.license
                            ? `${result.license}${
                                result.licenseVersion
                                  ? ` ${result.licenseVersion}`
                                  : ""
                              }`
                            : "License to verify"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-3">
          <Field label="Image URL (HTTPS)">
            <input
              type="url"
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="https://example.com/product-image.jpg"
              className={inputClass}
            />
          </Field>

          <button
            type="button"
            onClick={useManualUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Check size={16} />
            Use this image
          </button>

          <p className="text-[11px] leading-5 text-slate-500">
            Use an image URL you have permission to use. This saves the URL; it
            does not upload a file to your server.
          </p>
        </div>
      )}

      {image?.source === "openverse" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Image license">
            <input
              value={image.license || ""}
              onChange={(event) =>
                onChange({ ...image, license: event.target.value })
              }
              maxLength={300}
              placeholder="e.g. CC BY 4.0"
              className={inputClass}
            />
          </Field>

          <Field label="License version">
            <input
              value={image.licenseVersion || ""}
              onChange={(event) =>
                onChange({
                  ...image,
                  licenseVersion: event.target.value,
                })
              }
              maxLength={50}
              placeholder="e.g. 4.0"
              className={inputClass}
            />
          </Field>

          <Field label="Photographer / attribution">
            <input
              value={image.attribution || ""}
              onChange={(event) =>
                onChange({ ...image, attribution: event.target.value })
              }
              maxLength={500}
              placeholder="Creator or author"
              className={inputClass}
            />
          </Field>

          <Field label="License URL">
            <input
              type="url"
              value={image.licenseUrl || ""}
              onChange={(event) =>
                onChange({ ...image, licenseUrl: event.target.value })
              }
              maxLength={2000}
              placeholder="https://creativecommons.org/licenses/..."
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Original image page">
              <input
                type="url"
                value={image.sourcePageUrl || ""}
                onChange={(event) =>
                  onChange({ ...image, sourcePageUrl: event.target.value })
                }
                maxLength={2000}
                placeholder="Link to the original image page"
                className={inputClass}
              />
            </Field>

            {image.sourcePageUrl && (
              <a
                href={image.sourcePageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View original image page
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Products() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    ...emptyForm,
    image: { ...emptyImage },
  });

  const canEdit = ["owner", "manager", "inventory"].includes(user?.role);
  const canArchive = ["owner", "manager"].includes(user?.role);

  const loadCategories = useCallback(async () => {
    const response = await api.get("/categories");
    setCategories(response.data.data || []);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/products", {
        params: {
          page,
          limit: 20,
          search: search.trim() || undefined,
          category: categoryFilter || undefined,
          stockStatus: stockFilter || undefined,
        },
      });

      setProducts(response.data.data || []);
      setPagination(
        response.data.pagination || { page: 1, pages: 1, total: 0 }
      );
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Unable to load products",
        text: error.response?.data?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, stockFilter]);

  useEffect(() => {
    loadCategories().catch(() => {
      Swal.fire("Error", "Could not load product categories.", "error");
    });
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateImage(image) {
    setForm((current) => ({
      ...current,
      image: { ...image },
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      image: { ...emptyImage },
    });
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      category: product.category?._id || product.category || "",
      brand: product.brand || "",
      description: product.description || "",
      purchasePrice: String(product.purchasePrice ?? ""),
      salePrice: String(product.salePrice ?? ""),
      wholesalePrice:
        product.wholesalePrice == null ? "" : String(product.wholesalePrice),
      unit: product.unit || "piece",
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
      stockTrackingEnabled: product.stockTrackingEnabled !== false,
      image: {
        ...emptyImage,
        ...(typeof product.image === "string"
          ? {
              url: product.image,
              originalUrl: product.image,
              source: "manual",
            }
          : product.image || {}),
      },
    });

    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const purchasePrice = Number(form.purchasePrice);
    const salePrice = Number(form.salePrice);
    const wholesalePrice =
      form.wholesalePrice === "" ? null : Number(form.wholesalePrice);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (
      !form.name.trim() ||
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0 ||
      !Number.isFinite(salePrice) ||
      salePrice < 0 ||
      (wholesalePrice !== null &&
        (!Number.isFinite(wholesalePrice) || wholesalePrice < 0)) ||
      !Number.isFinite(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      Swal.fire(
        "Check the form",
        "Enter a product name and valid non-negative prices and stock thresholds.",
        "warning"
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      category: form.category || null,
      brand: form.brand.trim(),
      description: form.description.trim(),
      purchasePrice,
      salePrice,
      wholesalePrice,
      unit: form.unit,
      lowStockThreshold,
      stockTrackingEnabled: form.stockTrackingEnabled,
      image: form.image?.url
        ? {
            url: form.image.url,
            originalUrl: form.image.originalUrl || form.image.url,
            source: form.image.source || "manual",
            sourcePageUrl: form.image.sourcePageUrl || "",
            license: form.image.license || "",
            licenseVersion: form.image.licenseVersion || "",
            licenseUrl: form.image.licenseUrl || "",
            attribution: form.image.attribution || "",
          }
        : { ...emptyImage },
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
      } else {
        await api.post("/products", payload);
      }

      setModalOpen(false);

      await Swal.fire({
        icon: "success",
        title: editingId ? "Product updated" : "Product created",
        text: editingId
          ? "Your changes have been saved."
          : "The product has been added. Opening stock remains uncounted until recorded.",
        timer: 1800,
        showConfirmButton: false,
      });

      await loadProducts();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Could not save product",
        text:
          error.response?.data?.message ||
          "Check the entered details and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(product) {
    const result = await Swal.fire({
      title: "Archive this product?",
      text: `${product.name} will no longer appear in the active catalogue. Historical records will be retained.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Archive product",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/products/${product._id}/archive`);
      await loadProducts();

      Swal.fire({
        icon: "success",
        title: "Product archived",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Unable to archive",
        error.response?.data?.message || "Please try again.",
        "error"
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("");
    setStockFilter("");
    setPage(1);
  }

  const canReset = search || categoryFilter || stockFilter;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Manage your catalogue, pricing, product photos and stock visibility.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {pagination.total} active product
            {pagination.total === 1 ? "" : "s"}
          </p>
        </div>

        {canEdit && (
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => setImportOpen(true)}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <FileSpreadsheet size={18} />
      Import Excel
    </button>

    <button
      type="button"
      onClick={openCreate}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
    >
      <Plus size={18} />
      Add product
    </button>
  </div>
)}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Package size={21} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Active products</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {pagination.total}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <CircleAlert size={21} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Current view</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {stockFilter
                ? stockFilter === "low"
                  ? "Low stock"
                  : stockFilter === "out"
                    ? "Out of stock"
                    : stockFilter === "unknown"
                      ? "Not counted"
                      : stockFilter === "known"
                        ? "Known stock"
                        : "All stock statuses"
                : "All stock statuses"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Boxes size={21} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Stock tracking</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              Counted separately
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search product, SKU, barcode or brand..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} xl:w-48`}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => {
              setStockFilter(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} xl:w-44`}
          >
            <option value="">All stock statuses</option>
            <option value="known">Stock counted</option>
            <option value="unknown">Not counted</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>

          <button
            type="button"
            onClick={loadProducts}
            title="Refresh products"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {canReset && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Product</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">Purchase rate</th>
                <th className="px-4 py-4">Sale rate</th>
                <th className="px-4 py-4">Stock</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="px-5 py-5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Package size={26} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      No products found
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                      Add your first hardware item or change your search filters.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Add your first product
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stock = stockLabel(product);

                  return (
                    <tr
                      key={product._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            image={product.image}
                            name={product.name}
                            size="small"
                          />
                          <div className="min-w-0">
                            <p className="max-w-64 truncate text-sm font-semibold text-slate-800">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {product.sku || "No SKU"}
                              {product.brand ? ` · ${product.brand}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {product.category?.name || "Uncategorized"}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium tabular-nums text-slate-600">
                        {money(product.purchasePrice)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-900">
                        {money(product.salePrice)}
                        <span className="mt-1 block text-[11px] font-normal text-slate-400">
                          per {product.unit}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {product.stockTrackingEnabled &&
                        product.currentStock != null
                          ? `${product.currentStock} ${product.unit}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${stock.style}`}
                        >
                          {product.stockTrackingEnabled
                            ? stock.label
                            : "Tracking off"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              title="Edit product"
                              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canArchive && (
                            <button
                              type="button"
                              onClick={() => handleArchive(product)}
                              title="Archive product"
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {pagination.total === 0
              ? "No records"
              : `Showing ${(page - 1) * 20 + 1}–${Math.min(
                  page * 20,
                  pagination.total
                )} of ${pagination.total} products`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>

            <span className="min-w-20 text-center text-xs font-medium text-slate-600">
              Page {page} of {Math.max(1, pagination.pages)}
            </span>

            <button
              type="button"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit product" : "Add new product"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter product details, pricing and an optional product photo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[72vh] space-y-6 overflow-y-auto p-5 sm:p-7">
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Product photo
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Optional
                    </span>
                  </div>

                  <ImagePicker
                    image={form.image}
                    onChange={updateImage}
                    productName={form.name}
                  />
                </section>

                <div className="border-t border-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Product details
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Product name" required>
                      <input
                        name="name"
                        value={form.name}
                        onChange={updateField}
                        required
                        maxLength={200}
                        placeholder="e.g. Brass valve"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Category">
                      <select
                        name="category"
                        value={form.category}
                        onChange={updateField}
                        className={inputClass}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="SKU / product code">
                      <input
                        name="sku"
                        value={form.sku}
                        onChange={updateField}
                        maxLength={64}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Barcode">
                      <input
                        name="barcode"
                        value={form.barcode}
                        onChange={updateField}
                        maxLength={100}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Brand / manufacturer">
                      <input
                        name="brand"
                        value={form.brand}
                        onChange={updateField}
                        maxLength={100}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Unit of measurement" required>
                      <select
                        name="unit"
                        value={form.unit}
                        onChange={updateField}
                        className={inputClass}
                      >
                        {units.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Description / specifications">
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={updateField}
                      maxLength={2000}
                      rows={3}
                      placeholder="Size, dimensions, material or other details..."
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </section>

                <div className="border-t border-slate-100" />

                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">
                    Pricing and stock settings
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Purchase price (PKR)" required>
                      <input
                        name="purchasePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={updateField}
                        required
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Selling price (PKR)" required>
                      <input
                        name="salePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salePrice}
                        onChange={updateField}
                        required
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Wholesale / contractor price (PKR)">
                      <input
                        name="wholesalePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.wholesalePrice}
                        onChange={updateField}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Low-stock alert threshold">
                      <input
                        name="lowStockThreshold"
                        type="number"
                        min="0"
                        step="any"
                        value={form.lowStockThreshold}
                        onChange={updateField}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <input
                      type="checkbox"
                      name="stockTrackingEnabled"
                      checked={form.stockTrackingEnabled}
                      onChange={updateField}
                      className="mt-0.5 h-4 w-4 accent-blue-600"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        Track physical stock
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Opening stock remains unknown until it is recorded
                        through inventory. Do not enter estimated quantities.
                      </span>
                    </span>
                  </label>
                </section>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {importOpen && (
  <BulkProductImport
    onClose={() => setImportOpen(false)}
    onSuccess={() => {
      setImportOpen(false);
      loadProducts();
      loadCategories();
    }}
  />
)}
    </div>
  );
}
