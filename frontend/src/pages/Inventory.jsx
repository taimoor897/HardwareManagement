
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const quantity = (value) =>
  new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

const movementLabels = {
  opening: "Opening stock",
  in: "Stock received",
  out: "Stock removed",
  adjustment: "Physical adjustment",
};

const initialForm = {
  productId: "",
  type: "in",
  quantity: "",
  reason: "",
  reference: "",
};

function StatCard({ title, value, detail, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function StockBadge({ product }) {
  if (!product.stockTrackingEnabled) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        Not tracked
      </span>
    );
  }

  if (product.currentStock === null || product.currentStock === undefined) {
    return (
      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
        Count required
      </span>
    );
  }

  if (product.currentStock === 0) {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        Out of stock
      </span>
    );
  }

  if (product.currentStock <= product.lowStockThreshold) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Low stock
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      In stock
    </span>
  );
}

export default function Inventory() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [movementFilter, setMovementFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadInventory = useCallback(async () => {
    setLoading(true);

    try {
      const [summaryResponse, productsResponse, movementsResponse] =
        await Promise.all([
          api.get("/inventory/summary"),
          api.get("/products", {
            params: { page: 1, limit: 100 },
          }),
          api.get("/inventory/movements", {
            params: {
              page: 1,
              limit: 20,
              ...(movementFilter !== "all" ? { type: movementFilter } : {}),
            },
          }),
        ]);

      setSummary(summaryResponse.data.data);
      setProducts(productsResponse.data.data || []);
      setMovements(movementsResponse.data.data || []);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Couldn't load inventory",
        text:
          error.response?.data?.message ||
          "Check your backend connection and inventory routes.",
      });
    } finally {
      setLoading(false);
    }
  }, [movementFilter]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const trackedProducts = useMemo(
    () => products.filter((product) => product.stockTrackingEnabled),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trackedProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query);

      const stock = product.currentStock;
      const matchesFilter =
        filter === "all" ||
        (filter === "unknown" && (stock === null || stock === undefined)) ||
        (filter === "out" && stock === 0) ||
        (filter === "low" &&
          stock !== null &&
          stock !== undefined &&
          stock > 0 &&
          stock <= product.lowStockThreshold) ||
        (filter === "healthy" &&
          stock !== null &&
          stock !== undefined &&
          stock > product.lowStockThreshold);

      return matchesSearch && matchesFilter;
    });
  }, [trackedProducts, search, filter]);

  const selectedProduct = trackedProducts.find(
    (product) => product._id === form.productId
  );

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const openForm = (product = null, type = "in") => {
    setForm({
      ...initialForm,
      productId: product?._id || "",
      type,
    });
    setShowForm(true);
  };

  const submitMovement = async (event) => {
    event.preventDefault();

    if (!form.productId) {
      return Swal.fire({
        icon: "warning",
        title: "Choose a product",
        text: "Select a product before recording stock.",
      });
    }

    const enteredQuantity = Number(form.quantity);

    if (
      form.quantity === "" ||
      !Number.isFinite(enteredQuantity) ||
      enteredQuantity < 0 ||
      (["in", "out"].includes(form.type) && enteredQuantity <= 0)
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Check the quantity",
        text:
          "Enter a valid quantity. Stock received or removed must be greater than zero.",
      });
    }

    if (!form.reason.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Reason required",
        text: "Add a reason for this stock movement.",
      });
    }

    const labels = {
      opening: "set the opening stock for",
      in: "receive stock for",
      out: "remove stock from",
      adjustment: "adjust the physical count for",
    };

    const confirmation = await Swal.fire({
      title: "Confirm stock change",
      text: `You are about to ${labels[form.type]} ${selectedProduct?.name || "this product"}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm change",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    setSubmitting(true);

    try {
      const response = await api.post(
        `/inventory/products/${form.productId}/movements`,
        {
          type: form.type,
          quantity: enteredQuantity,
          reason: form.reason.trim(),
          reference: form.reference.trim(),
        }
      );

      setShowForm(false);
      setForm(initialForm);

      await Swal.fire({
        icon: "success",
        title: "Inventory updated",
        text: response.data.message || "Stock movement recorded.",
        timer: 1500,
        showConfirmButton: false,
      });

      await loadInventory();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Stock update failed",
        text:
          error.response?.data?.message ||
          "The stock movement could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMovementForProduct = (product) => {
    if (product.currentStock === null || product.currentStock === undefined) {
      openForm(product, "opening");
    } else {
      openForm(product, "in");
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" size={34} />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Warehouse size={16} />
            Inventory management
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track stock levels, record movements, and identify shortages.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <PackagePlus size={17} />
            Record stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Tracked products"
          value={summary?.totalProducts ?? 0}
          detail="Active products with stock tracking enabled"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          title="Stock valuation"
          value={money(summary?.stockValue)}
          detail="Known stock × purchase price"
          icon={Package}
          tone="green"
        />
        <StatCard
          title="Units on hand"
          value={quantity(summary?.totalUnits)}
          detail="Sum of known quantities across tracked units"
          icon={Warehouse}
        />
        <StatCard
          title="Low stock"
          value={summary?.lowStockProducts ?? 0}
          detail="Above zero but at or below threshold"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          title="Out of stock"
          value={summary?.outOfStockProducts ?? 0}
          detail="Products with a verified zero balance"
          icon={Package}
          tone="red"
        />
        <StatCard
          title="Count required"
          value={summary?.unknownStockProducts ?? 0}
          detail="Opening quantity has not been established"
          icon={ClipboardList}
          tone="slate"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Stock levels</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a product to record its opening count or next movement.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU, barcode"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-64"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="all">All stock statuses</option>
              <option value="unknown">Count required</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="healthy">Healthy stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Product</th>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">On hand</th>
                <th className="px-5 py-3.5 font-semibold">Threshold</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.sku || "No SKU"} · {product.unit}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {product.category?.name || "Uncategorized"}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {product.currentStock == null
                      ? "—"
                      : `${quantity(product.currentStock)} ${product.unit}`}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {quantity(product.lowStockThreshold)} {product.unit}
                  </td>
                  <td className="px-5 py-4">
                    <StockBadge product={product} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openMovementForProduct(product)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {product.currentStock == null ? "Set opening stock" : "Manage stock"}
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredProducts.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <Boxes className="mx-auto text-slate-300" size={34} />
                    <p className="mt-3 font-semibold text-slate-800">
                      No matching products
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or stock filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Showing {filteredProducts.length} of {trackedProducts.length} tracked products loaded.
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Recent stock movements</h2>
            <p className="mt-1 text-sm text-slate-500">
              An audit trail of recorded inventory changes.
            </p>
          </div>
          <select
            value={movementFilter}
            onChange={(event) => setMovementFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            <option value="all">All movements</option>
            <option value="opening">Opening stock</option>
            <option value="in">Stock received</option>
            <option value="out">Stock removed</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100">
          {movements.map((movement) => {
            const positive = movement.quantityDelta > 0;
            const negative = movement.quantityDelta < 0;

            return (
              <div
                key={movement._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-xl p-2.5 ${
                      positive
                        ? "bg-emerald-50 text-emerald-700"
                        : negative
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {positive ? (
                      <ArrowDownLeft size={19} />
                    ) : negative ? (
                      <ArrowUpRight size={19} />
                    ) : (
                      <ClipboardList size={19} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {movement.product?.name || "Product unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {movementLabels[movement.type] || movement.type}
                      {movement.reference ? ` · Ref: ${movement.reference}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {movement.reason} · By {movement.createdBy?.name || "User"}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p
                    className={`font-bold ${
                      positive
                        ? "text-emerald-700"
                        : negative
                          ? "text-red-700"
                          : "text-slate-800"
                    }`}
                  >
                    {movement.type === "opening"
                      ? `Opening: ${quantity(movement.newStock)}`
                      : movement.type === "adjustment"
                        ? `${movement.previousStock} → ${movement.newStock}`
                        : `${positive ? "+" : ""}${quantity(movement.quantityDelta)}`}
                    {movement.type !== "opening" && movement.type !== "adjustment"
                      ? ` ${movement.product?.unit || ""}`
                      : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 sm:justify-end">
                    <Clock3 size={12} />
                    {new Date(movement.createdAt).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {!movements.length && (
            <div className="px-5 py-12 text-center">
              <Clock3 className="mx-auto text-slate-300" size={30} />
              <p className="mt-3 font-semibold text-slate-800">
                No stock movements yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your inventory activity will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setShowForm(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Record stock movement
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Every change is saved in the stock history.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitMovement} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Product
                </label>
                <select
                  required
                  value={form.productId}
                  onChange={(event) => setField("productId", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a product</option>
                  {trackedProducts.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                      {product.sku ? ` · ${product.sku}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Current stock</span>
                    <span className="font-semibold text-slate-900">
                      {selectedProduct.currentStock == null
                        ? "Unknown — opening count required"
                        : `${quantity(selectedProduct.currentStock)} ${selectedProduct.unit}`}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Stock threshold</span>
                    <span className="text-sm font-medium text-slate-700">
                      {quantity(selectedProduct.lowStockThreshold)} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Movement type
                </label>
                <select
                  required
                  value={form.type}
                  onChange={(event) => setField("type", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="opening">Opening stock count</option>
                  <option value="in">Stock received / stock in</option>
                  <option value="out">Stock removed / stock out</option>
                  <option value="adjustment">Physical stock adjustment</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {form.type === "adjustment"
                    ? "Enter the actual physical quantity counted, not the difference."
                    : form.type === "opening"
                      ? "Use only when the product's stock is currently unknown."
                      : form.type === "in"
                        ? "Enter the quantity received."
                        : "Enter the quantity to remove from available stock."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {form.type === "adjustment"
                    ? "Actual counted quantity"
                    : form.type === "opening"
                      ? "Opening quantity"
                      : "Quantity"}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={(event) => setField("quantity", event.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                {selectedProduct && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Unit: {selectedProduct.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>
                <input
                  required
                  maxLength={300}
                  value={form.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                  placeholder={
                    form.type === "in"
                      ? "e.g. Goods received from supplier"
                      : form.type === "out"
                        ? "e.g. Damaged goods"
                        : form.type === "adjustment"
                          ? "e.g. Physical stock count correction"
                          : "e.g. Initial physical stock count"
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reference <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  maxLength={100}
                  value={form.reference}
                  onChange={(event) => setField("reference", event.target.value)}
                  placeholder="e.g. supplier invoice or delivery note"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !trackedProducts.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  {submitting ? "Saving..." : "Confirm stock change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
