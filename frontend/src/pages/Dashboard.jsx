import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Plus,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  CircleHelp,
} from "lucide-react";
import api from "../api/client";

const formatPKR = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function Dashboard() {
  const [productCount, setProductCount] = useState(null);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [unknownStockCount, setUnknownStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [salesTotal, setSalesTotal] = useState(null);
const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        // Fetch the total product count.
        const countResponse = await api.get("/products", {
          params: { page: 1, limit: 1 },
        });

        if (active) {
          setProductCount(countResponse.data.pagination?.total ?? null);
        }

        // Fetch product records to calculate inventory valuation.
        // Increase the limit if your catalogue exceeds 1000 products.
        const inventoryResponse = await api.get("/products", {
          params: { page: 1, limit: 1000 },
        });

        if (!active) return;

        const products =
          inventoryResponse.data.products ??
          inventoryResponse.data.data ??
          inventoryResponse.data;

        if (!Array.isArray(products)) {
          throw new Error("Unexpected products API response format.");
        }

        const activeProducts = products.filter(
          (product) => product.isActive !== false
        );

        const unknownStock = activeProducts.filter(
          (product) =>
            product.stockTrackingEnabled !== false &&
            (product.currentStock === null ||
              product.currentStock === undefined ||
              product.currentStock === "")
        ).length;

        const value = activeProducts.reduce((total, product) => {
          if (product.stockTrackingEnabled === false) return total;

          const stock = product.currentStock;

          // Unknown stock cannot be valued accurately.
          if (stock === null || stock === undefined || stock === "") {
            return total;
          }

          return (
            total +
            Math.max(0, Number(product.purchasePrice) || 0) *
              Math.max(0, Number(stock) || 0)
          );
        }, 0);

        setInventoryValue(value);
        setUnknownStockCount(unknownStock);
      } catch (error) {
        console.error("Dashboard data loading failed:", error);
        if (active) {
          setInventoryValue(null);
        }
      } finally {
        if (active) {
          setLoading(false);
          setInventoryLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const quickActions = [
    {
      title: "Add a product",
      description: "Create an item and set its rates.",
      to: "/products",
      icon: Plus,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Open point of sale",
      description: "Create a customer bill.",
      to: "/pos",
      icon: ShoppingCart,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Record a purchase",
      description: "Manage incoming goods.",
      to: "/purchases",
      icon: Truck,
      color: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-2xl bg-[#101a30] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
          Business overview
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to your workspace.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          Manage your product catalogue, billing, purchases, and inventory from
          one workspace.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          Manage products
          <ArrowUpRight size={17} />
        </Link>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900">
          Current catalogue
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Live information retrieved from your backend.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active products</span>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Package size={20} />
              </span>
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "…" : productCount === null ? "—" : productCount}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {productCount === null && !loading
                ? "Could not load product totals."
                : "Saved in your database."}
            </p>
          </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Sales performance</span>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <ShoppingCart size={20} />
              </span>
            </div>
            <p className="mt-5 text-xl font-bold text-slate-900">
              {salesLoading
                ? "Loading…"
                : salesTotal === null
                  ? "Unavailable"
                  : formatPKR(salesTotal)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {salesTotal === null && !salesLoading
                ? "Sales data could not be loaded."
                : "Sales revenue for the current reporting period."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Inventory valuation</span>
              <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                <CircleHelp size={20} />
              </span>
            </div>
            <p className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              {inventoryLoading
                ? "Calculating…"
                : inventoryValue === null
                  ? "Unavailable"
                  : formatPKR(inventoryValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {inventoryValue === null
                ? "Could not calculate inventory value."
                : unknownStockCount > 0
                  ? `${unknownStockCount} product(s) still need opening stock counts. Total excludes their unknown value.`
                  : "Based on purchase cost × recorded stock."}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900">Quick actions</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                to={action.to}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className={`rounded-xl p-3 ${action.color}`}>
                  <Icon size={21} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                    Open module
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}