
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Package,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const number = (value) =>
  new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const todayPK = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  });

function getDates(period) {
  const today = todayPK();
  const date = new Date(`${today}T12:00:00+05:00`);

  if (period === "today") {
    return { startDate: today, endDate: today };
  }

  if (period === "week") {
    const day = date.getDay();
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
    return {
      startDate: date.toLocaleDateString("en-CA", {
        timeZone: "Asia/Karachi",
      }),
      endDate: today,
    };
  }

  if (period === "month") {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }

  if (period === "year") {
    return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  }

  return { startDate: "", endDate: "" };
}

function MetricCard({ label, value, icon: Icon, tone, detail }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone] || tones.blue}`}>
          <Icon size={21} />
        </div>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, children, action }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function EmptyState({ label = "No data for this period" }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center text-center">
      <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
        <FileSpreadsheet size={25} />
      </div>
      <p className="mt-3 font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-500">
        Try another date range or add some records first.
      </p>
    </div>
  );
}

function BarList({ items, labelKey, valueKey, formatter = money, color = "bg-blue-500" }) {
  if (!items?.length) return <EmptyState />;

  const maximum = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const width = Math.max(0, Math.min(100, (value / maximum) * 100));

        return (
          <div key={`${item[labelKey]}-${index}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                {item[labelKey]}
              </span>
              <span className="shrink-0 text-sm font-bold text-slate-900">
                {formatter(value)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`${color} h-full rounded-full transition-all duration-500`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesTrendChart({ data }) {
  if (!data?.length) return <EmptyState label="No sales recorded in this period" />;

  const chartData = data.slice(-14);
  const max = Math.max(...chartData.map((item) => Number(item.sales) || 0), 1);

  return (
    <div>
      <div className="flex h-56 items-end gap-2 border-b border-slate-100 pb-2 sm:gap-3">
        {chartData.map((item) => {
          const height = Math.max(3, ((Number(item.sales) || 0) / max) * 100);

          return (
            <div
              key={item.date}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${item.date}: ${money(item.sales)}`}
            >
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-9 rounded-t-md bg-blue-500 transition hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-slate-400 sm:text-xs">
                {item.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
        Daily net sales (up to the latest 14 days with sales)
      </div>
    </div>
  );
}

function Table({ columns, rows, empty = "No records available" }) {
  if (!rows?.length) return <EmptyState label={empty} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-3 font-semibold ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row._id || row.key || row.date || row.method || row.name || index}
                className="transition hover:bg-slate-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-3.5 text-sm text-slate-700 ${column.align === "right" ? "text-right" : ""}`}
                >
                  {column.render ? column.render(row) : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Status({ value }) {
  const style =
    value === "In stock"
      ? "bg-emerald-50 text-emerald-700"
      : value === "Low stock"
        ? "bg-amber-50 text-amber-700"
        : value === "Out of stock"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {value}
    </span>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [dates, setDates] = useState(() => getDates("month"));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryStatus, setInventoryStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = {
      startDate: dates.startDate || undefined,
      endDate: dates.endDate || undefined,
    };

    try {
      const [overviewRes, trendRes, productsRes, paymentsRes, inventoryRes] =
        await Promise.all([
          api.get("/reports/overview", { params }),
          api.get("/reports/sales-trend", { params }),
          api.get("/reports/top-products", { params }),
          api.get("/reports/payments", { params }),
          api.get("/reports/inventory"),
        ]);

      setSummary(overviewRes.data?.data || null);
      setTrend(trendRes.data?.data || []);
      setTopProducts(productsRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
      setInventory(inventoryRes.data?.data || []);
    } catch (err) {
      console.error("Report loading failed:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load reports. Check your API route registration and database connection."
      );
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function choosePeriod(next) {
    setPeriod(next);
    if (next !== "custom") setDates(getDates(next));
  }

  function applyCustomRange() {
    if (customStart && customEnd && customStart > customEnd) {
      Swal.fire("Invalid date range", "Start date must be before end date.", "warning");
      return;
    }

    setDates({ startDate: customStart, endDate: customEnd });
    setPeriod("custom");
  }

  const filteredInventory = inventory.filter((item) => {
    const search = inventorySearch.toLowerCase().trim();
    const matchesSearch =
      !search ||
      item.name?.toLowerCase().includes(search) ||
      item.sku?.toLowerCase().includes(search);

    const matchesStatus =
      inventoryStatus === "all" || item.status === inventoryStatus;

    return matchesSearch && matchesStatus;
  });

  function exportCSV() {
    let filename = "hardware-shop-report";
    let rows = [];

    if (tab === "inventory") {
      filename += "-inventory";
      rows = [
        ["Product", "SKU", "Stock", "Unit", "Status", "Cost Value (PKR)", "Retail Value (PKR)"],
        ...filteredInventory.map((item) => [
          item.name,
          item.sku,
          item.currentStock ?? "Untracked",
          item.unit,
          item.status,
          item.stockCostValue ?? "",
          item.stockRetailValue ?? "",
        ]),
      ];
    } else if (tab === "products") {
      filename += "-top-products";
      rows = [
        ["Product", "SKU", "Quantity Sold", "Revenue (PKR)", "Product Cost (PKR)", "Gross Profit (PKR)"],
        ...topProducts.map((item) => [
          item.name,
          item.sku,
          item.quantitySold,
          item.revenue,
          item.cost,
          item.grossProfit,
        ]),
      ];
    } else if (tab === "payments") {
      filename += "-payments";
      rows = [
        ["Payment Method", "Transactions", "Amount (PKR)"],
        ...payments.map((item) => [item.method, item.transactions, item.amount]),
      ];
    } else if (tab === "sales") {
      filename += "-sales-trend";
      rows = [
        ["Date", "Net Sales (PKR)", "Transactions", "Product Cost (PKR)", "Gross Profit (PKR)"],
        ...trend.map((item) => [
          item.date,
          item.sales,
          item.transactions,
          item.cost,
          item.grossProfit,
        ]),
      ];
    } else {
      filename += "-overview";
      rows = [
        ["Metric", "Value"],
        ["Gross sales", summary?.grossSales ?? 0],
        ["Discounts", summary?.discounts ?? 0],
        ["Net sales", summary?.netSales ?? 0],
        ["Cost of goods sold", summary?.costOfGoodsSold ?? 0],
        ["Gross profit", summary?.grossProfit ?? 0],
        ["Recorded expenses", summary?.totalExpenses ?? 0],
        ["Operating profit", summary?.operatingProfit ?? 0],
        ["Tax collected", summary?.taxCollected ?? 0],
        ["Inventory cost value", summary?.inventory?.inventoryCostValue ?? 0],
        ["Inventory retail value", summary?.inventory?.inventoryRetailValue ?? 0],
      ];
    }

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${todayPK()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: ChartNoAxesCombined },
    { id: "sales", label: "Sales", icon: BarChart3 },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "payments", label: "Payments", icon: Wallet },
    { id: "inventory", label: "Inventory", icon: Boxes },
  ];

  return (
    <div className="min-h-full space-y-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <BarChart3 size={17} />
            BUSINESS INTELLIGENCE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Reports & Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track sales, understand product performance, monitor inventory and make better business decisions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["today", "Today"],
            ["week", "This week"],
            ["month", "This month"],
            ["year", "This year"],
            ["all", "All time"],
            ["custom", "Custom range"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => choosePeriod(value)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                period === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="Start date"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              aria-label="End date"
            />
            <button
              onClick={applyCustomRange}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Apply range
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              tab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-rose-800">Reports could not be loaded</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
          <button
            onClick={loadReports}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <LoaderCircle className="mx-auto animate-spin text-blue-600" size={32} />
            <p className="mt-3 text-sm font-medium text-slate-500">Preparing your reports...</p>
          </div>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Net sales"
                  value={money(summary?.netSales)}
                  icon={Receipt}
                  tone="blue"
                  detail={`${number(summary?.salesCount)} transactions`}
                />
                <MetricCard
                  label="Gross profit"
                  value={money(summary?.grossProfit)}
                  icon={TrendingUp}
                  tone="green"
                  detail={`${number(summary?.netSales > 0 ? summary.grossProfit / summary.netSales * 100 : 0)}% gross margin`}
                />
                <MetricCard
                  label="Operating profit"
                  value={money(summary?.operatingProfit)}
                  icon={summary?.operatingProfit >= 0 ? TrendingUp : TrendingDown}
                  tone={summary?.operatingProfit >= 0 ? "green" : "rose"}
                  detail="After recorded business expenses"
                />
                <MetricCard
                  label="Recorded expenses"
                  value={money(summary?.totalExpenses)}
                  icon={Wallet}
                  tone="amber"
                  detail={`${number(summary?.expenseCount)} expense records`}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Section
                  title="Sales trend"
                  subtitle="Daily net sales for the selected period"
                  icon={ChartNoAxesCombined}
                >
                  <SalesTrendChart data={trend} />
                </Section>

                <Section
                  title="Expenses by category"
                  subtitle="Where your business spending goes"
                  icon={Wallet}
                >
                  <BarList
                    items={summary?.expensesByCategory || []}
                    labelKey="category"
                    valueKey="amount"
                    color="bg-amber-500"
                  />
                </Section>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Product costs"
                  value={money(summary?.costOfGoodsSold)}
                  icon={Package}
                  tone="violet"
                  detail="Cost of products sold"
                />
                <MetricCard
                  label="Discounts"
                  value={money(summary?.discounts)}
                  icon={TrendingDown}
                  tone="rose"
                  detail="Discounts on recorded sales"
                />
                <MetricCard
                  label="Stock cost value"
                  value={money(summary?.inventory?.inventoryCostValue)}
                  icon={Boxes}
                  tone="blue"
                  detail="Tracked current inventory"
                />
                <MetricCard
                  label="Low-stock products"
                  value={number(summary?.inventory?.lowStockCount)}
                  icon={ShoppingBag}
                  tone="amber"
                  detail={`${number(summary?.inventory?.outOfStockCount)} out of stock`}
                />
              </div>

              <Section
                title="Top-selling products"
                subtitle="Ranked by units sold in this period"
                icon={ShoppingBag}
                action={
                  <button
                    onClick={() => setTab("products")}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View all
                  </button>
                }
              >
                <Table
                  rows={topProducts.slice(0, 5)}
                  columns={[
                    {
                      key: "name",
                      label: "Product",
                      render: (item) => (
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.sku || "No SKU"}</p>
                        </div>
                      ),
                    },
                    {
                      key: "quantitySold",
                      label: "Units sold",
                      align: "right",
                      render: (item) => number(item.quantitySold),
                    },
                    {
                      key: "revenue",
                      label: "Sales value",
                      align: "right",
                      render: (item) => money(item.revenue),
                    },
                    {
                      key: "grossProfit",
                      label: "Gross profit",
                      align: "right",
                      render: (item) => (
                        <span className={item.grossProfit >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                          {money(item.grossProfit)}
                        </span>
                      ),
                    },
                  ]}
                />
              </Section>
            </div>
          )}

          {tab === "sales" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Sales before discounts" value={money(summary?.grossSales)} icon={Receipt} tone="blue" />
                <MetricCard label="Net sales" value={money(summary?.netSales)} icon={BanknoteIcon} tone="green" />
                <MetricCard label="Transactions" value={number(summary?.salesCount)} icon={ShoppingBag} tone="violet" />
                <MetricCard label="Average sale" value={money(summary?.averageSale)} icon={TrendingUp} tone="amber" />
              </div>

              <Section
                title="Sales over time"
                subtitle="Dates shown in Pakistan Standard Time"
                icon={BarChart3}
              >
                <SalesTrendChart data={trend} />
              </Section>

              <Section
                title="Daily sales details"
                subtitle="Daily sales, product costs and gross profit"
                icon={CalendarDays}
              >
                <Table
                  rows={trend}
                  columns={[
                    { key: "date", label: "Date" },
                    { key: "transactions", label: "Transactions", align: "right" },
                    { key: "sales", label: "Net sales", align: "right", render: (item) => money(item.sales) },
                    { key: "cost", label: "Product cost", align: "right", render: (item) => money(item.cost) },
                    { key: "grossProfit", label: "Gross profit", align: "right", render: (item) => money(item.grossProfit) },
                  ]}
                />
              </Section>
            </div>
          )}

          {tab === "products" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Products sold" value={number(topProducts.length)} icon={ShoppingBag} tone="blue" detail="Unique products with sales" />
                <MetricCard label="Units sold" value={number(summary?.itemsSold)} icon={Package} tone="violet" />
                <MetricCard label="Average sale" value={money(summary?.averageSale)} icon={TrendingUp} tone="green" />
              </div>

              <Section
                title="Product performance"
                subtitle="Products ranked by quantity sold"
                icon={ShoppingBag}
              >
                <Table
                  rows={topProducts}
                  empty="No products sold in this period"
                  columns={[
                    {
                      key: "name",
                      label: "Product",
                      render: (item) => (
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.sku || "No SKU"}</p>
                        </div>
                      ),
                    },
                    { key: "quantitySold", label: "Quantity sold", align: "right", render: (item) => number(item.quantitySold) },
                    { key: "revenue", label: "Sales value", align: "right", render: (item) => money(item.revenue) },
                    { key: "cost", label: "Product cost", align: "right", render: (item) => money(item.cost) },
                    {
                      key: "grossProfit",
                      label: "Gross profit",
                      align: "right",
                      render: (item) => (
                        <span className={item.grossProfit >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                          {money(item.grossProfit)}
                        </span>
                      ),
                    },
                  ]}
                />
              </Section>
              <p className="text-xs leading-5 text-slate-400">
                Product sales values are calculated from saved line-item prices. Sale-level discounts are not allocated to individual products in this ranking, so product-level figures may not add up exactly to net sales.
              </p>
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Total transactions" value={number(summary?.salesCount)} icon={Receipt} tone="blue" />
                <MetricCard label="Net sales" value={money(summary?.netSales)} icon={Wallet} tone="green" />
              </div>

              <Section
                title="Payment method breakdown"
                subtitle="Recorded sale totals grouped by payment method"
                icon={Wallet}
              >
                <BarList
                  items={payments}
                  labelKey="method"
                  valueKey="amount"
                  color="bg-violet-500"
                />
              </Section>

              <Section
                title="Payment details"
                subtitle="Transaction count and recorded total per method"
                icon={Receipt}
              >
                <Table
                  rows={payments}
                  empty="No payment records in this period"
                  columns={[
                    { key: "method", label: "Payment method" },
                    { key: "transactions", label: "Transactions", align: "right", render: (item) => number(item.transactions) },
                    { key: "amount", label: "Recorded sale total", align: "right", render: (item) => money(item.amount) },
                  ]}
                />
              </Section>
              <p className="text-xs leading-5 text-slate-400">
                Payment totals use each sale's recorded total, including tax where applicable. They represent recorded sales by payment method, not a bank reconciliation or proof of settlement.
              </p>
            </div>
          )}

          {tab === "inventory" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Tracked products" value={number(summary?.inventory?.trackedProducts)} icon={Boxes} tone="blue" />
                <MetricCard label="Stock cost value" value={money(summary?.inventory?.inventoryCostValue)} icon={Wallet} tone="green" />
                <MetricCard label="Low stock" value={number(summary?.inventory?.lowStockCount)} icon={TrendingDown} tone="amber" />
                <MetricCard label="Out of stock" value={number(summary?.inventory?.outOfStockCount)} icon={Package} tone="rose" />
              </div>

              <Section
                title="Current inventory"
                subtitle={`${filteredInventory.length} products matching the current filters`}
                icon={Boxes}
              >
                <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      placeholder="Search product or SKU..."
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <select
                    value={inventoryStatus}
                    onChange={(e) => setInventoryStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="all">All stock statuses</option>
                    <option value="In stock">In stock</option>
                    <option value="Low stock">Low stock</option>
                    <option value="Out of stock">Out of stock</option>
                    <option value="Untracked">Untracked</option>
                  </select>
                </div>

                <Table
                  rows={filteredInventory}
                  empty="No matching inventory products"
                  columns={[
                    {
                      key: "name",
                      label: "Product",
                      render: (item) => (
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.sku || "No SKU"}</p>
                        </div>
                      ),
                    },
                    {
                      key: "currentStock",
                      label: "Stock",
                      align: "right",
                      render: (item) =>
                        item.stockTracked
                          ? `${number(item.currentStock)} ${item.unit || ""}`
                          : "Untracked",
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (item) => <Status value={item.status} />,
                    },
                    {
                      key: "stockCostValue",
                      label: "Cost value",
                      align: "right",
                      render: (item) => item.stockTracked ? money(item.stockCostValue) : "—",
                    },
                    {
                      key: "stockRetailValue",
                      label: "Retail value",
                      align: "right",
                      render: (item) => item.stockTracked ? money(item.stockRetailValue) : "—",
                    },
                  ]}
                />
              </Section>
              <p className="text-xs leading-5 text-slate-400">
                Inventory values use current tracked stock multiplied by each product's current purchase or sale price. They are estimates, not a historical valuation or audited accounting balance.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BanknoteIcon({ size = 21 }) {
  return <Wallet size={size} />;
}
