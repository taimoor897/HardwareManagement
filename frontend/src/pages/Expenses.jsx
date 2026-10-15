
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Download,
  Ellipsis,
  FileText,
  Filter,
  LoaderCircle,
  Pencil,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";

const CATEGORIES = [
  "Rent",
  "Salaries",
  "Electricity",
  "Water",
  "Internet",
  "Transport",
  "Repairs & Maintenance",
  "Packaging",
  "Marketing",
  "Office Supplies",
  "Bank Charges",
  "Other",
];

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Mobile Wallet",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  category: "Other",
  amount: "",
  expenseDate: new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  }),
  paymentMethod: "Cash",
  paidTo: "",
  reference: "",
  notes: "",
};

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

function localDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

function todayPK() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  });
}

function getPeriod(period) {
  const today = todayPK();
  const date = new Date(`${today}T12:00:00+05:00`);

  if (period === "today") {
    return { startDate: today, endDate: today };
  }

  if (period === "week") {
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + mondayOffset);

    const monday = date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    return { startDate: monday, endDate: today };
  }

  if (period === "month") {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }

  if (period === "year") {
    return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  }

  return { startDate: "", endDate: "" };
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  detail,
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function ExpenseModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    if (!form.amount || !Number.isFinite(Number(form.amount)) ||
        Number(form.amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.expenseDate) {
      setError("Please select an expense date.");
      return;
    }

    const result = await onSave({
      ...form,
      title: form.title.trim(),
      amount: Number(form.amount),
      paidTo: form.paidTo.trim(),
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    });

    if (result?.error) setError(result.error);
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initial?._id ? "Edit expense" : "Record an expense"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep your shop's spending organized.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Expense title *
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="e.g. Shop electricity bill"
                maxLength={150}
                required
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Amount (PKR) *
              <input
                className={inputClass}
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => change("amount", e.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Expense date *
              <input
                className={inputClass}
                type="date"
                value={form.expenseDate}
                onChange={(e) => change("expenseDate", e.target.value)}
                required
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Category *
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Payment method
              <select
                className={inputClass}
                value={form.paymentMethod}
                onChange={(e) => change("paymentMethod", e.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Paid to
              <input
                className={inputClass}
                value={form.paidTo}
                onChange={(e) => change("paidTo", e.target.value)}
                placeholder="Person or business"
                maxLength={150}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Receipt / reference
              <input
                className={inputClass}
                value={form.reference}
                onChange={(e) => change("reference", e.target.value)}
                placeholder="Receipt or transaction ID"
                maxLength={100}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Notes
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder="Additional details (optional)"
                maxLength={1000}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? "Saving..." : initial?._id ? "Save changes" : "Record expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [period, setPeriod] = useState("month");
  const [dates, setDates] = useState(() => getPeriod("month"));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (dates.startDate) params.set("startDate", dates.startDate);
    if (dates.endDate) params.set("endDate", dates.endDate);
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);

    return params.toString();
  }, [page, dates, search, category]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [summaryResponse, expensesResponse] = await Promise.all([
        api.get("/expenses/summary", {
          params: {
            startDate: dates.startDate || undefined,
            endDate: dates.endDate || undefined,
          },
        }),
        api.get(`/expenses?${query}`),
      ]);

      setSummary(summaryResponse.data?.data || null);
      setExpenses(expensesResponse.data?.data || []);
      setPagination(
        expensesResponse.data?.pagination || {
          page: 1,
          pages: 1,
          total: 0,
        }
      );
    } catch (error) {
      console.error("Unable to load financial data:", error);
      Swal.fire({
        icon: "error",
        title: "Unable to load financial data",
        text:
          error.response?.data?.message ||
          "Check your connection and ensure the expenses API is registered.",
      });
    } finally {
      setLoading(false);
    }
  }, [dates, query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function selectPeriod(nextPeriod) {
    setPeriod(nextPeriod);
    if (nextPeriod !== "custom") {
      setDates(getPeriod(nextPeriod));
      setPage(1);
    }
  }

  function applyCustomDates() {
    if (customStart && customEnd && customStart > customEnd) {
      Swal.fire("Invalid date range", "Start date must be before end date.", "warning");
      return;
    }

    setDates({
      startDate: customStart,
      endDate: customEnd,
    });
    setPeriod("custom");
    setPage(1);
  }

  async function saveExpense(form) {
    setSaving(true);

    try {
      if (modal?._id) {
        await api.patch(`/expenses/${modal._id}`, form);
      } else {
        await api.post("/expenses", form);
      }

      setModal(null);
      await loadData();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: modal?._id ? "Expense updated" : "Expense recorded",
        showConfirmButton: false,
        timer: 2200,
      });

      return { success: true };
    } catch (error) {
      return {
        error:
          error.response?.data?.message ||
          "Unable to save this expense. Please try again.",
      };
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense) {
    const result = await Swal.fire({
      title: "Delete this expense?",
      text: `${expense.title} — ${money(expense.amount)}. This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete expense",
      cancelButtonText: "Keep expense",
      confirmButtonColor: "#e11d48",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/expenses/${expense._id}`);
      await loadData();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Expense deleted",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      Swal.fire(
        "Could not delete",
        error.response?.data?.message || "Please try again.",
        "error"
      );
    }
  }

  function exportCSV() {
    const rows = [
      ["Date", "Title", "Category", "Paid To", "Payment Method", "Reference", "Amount (PKR)", "Notes"],
      ...expenses.map((expense) => [
        localDate(expense.expenseDate),
        expense.title,
        expense.category,
        expense.paidTo || "",
        expense.paymentMethod || "",
        expense.reference || "",
        expense.amount,
        expense.notes || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hardware-shop-expenses-${todayPK()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const profit = summary?.netProfit ?? 0;
  const hasProfit = profit >= 0;

  return (
    <div className="min-h-full space-y-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <ChartNoAxesCombined size={17} />
            FINANCIAL MANAGEMENT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Expenses & Profit
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Understand your sales, product costs, business expenses and operating profit.
          </p>
        </div>

        <button
          onClick={() => setModal({ ...EMPTY_FORM })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <CirclePlus size={18} />
          Record expense
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
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
              onClick={() => selectPeriod(value)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                period === value
                  ? "bg-blue-600 text-white shadow-sm"
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
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="Start date"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="End date"
            />
            <button
              onClick={applyCustomDates}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loading && !summary ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoaderCircle className="animate-spin text-blue-600" size={30} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Net sales"
              value={money(summary?.netSales)}
              icon={Banknote}
              tone="blue"
              detail={`${number(summary?.transactionCount)} sales transactions`}
            />
            <MetricCard
              label="Cost of goods sold"
              value={money(summary?.costOfGoodsSold)}
              icon={Receipt}
              tone="amber"
              detail={`${number(summary?.itemsSold)} units sold`}
            />
            <MetricCard
              label="Gross profit"
              value={money(summary?.grossProfit)}
              icon={TrendingUp}
              tone="green"
              detail={`${number(summary?.grossMargin)}% gross margin`}
            />
            <MetricCard
              label="Total expenses"
              value={money(summary?.totalExpenses)}
              icon={Wallet}
              tone="red"
              detail={`${number(summary?.expenseCount)} recorded expenses`}
            />
          </div>

          <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
            hasProfit ? "border-emerald-200" : "border-rose-200"
          }`}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${
                  hasProfit ? "text-emerald-700" : "text-rose-700"
                }`}>
                  {hasProfit ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
                  NET OPERATING PROFIT
                </div>
                <p className={`break-words text-3xl font-bold tracking-tight sm:text-4xl ${
                  hasProfit ? "text-emerald-700" : "text-rose-700"
                }`}>
                  {money(summary?.netProfit)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Gross profit minus recorded business expenses.
                </p>
              </div>
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center self-start rounded-2xl sm:self-center ${
                hasProfit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {hasProfit ? <TrendingUp size={30} /> : <TrendingDown size={30} />}
              </div>
            </div>

            <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="text-xs font-medium text-slate-500">Sales before discounts</p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {money(summary?.grossSales)}
                </p>
              </div>
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="text-xs font-medium text-slate-500">Discounts given</p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {money(summary?.discounts)}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">Net profit margin</p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {number(summary?.netMargin)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Expense breakdown</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Spending by category for the selected period
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                  <Activity size={20} />
                </div>
              </div>

              {summary?.expensesByCategory?.length ? (
                <div className="space-y-5">
                  {summary.expensesByCategory.map((item, index) => {
                    const total = Number(summary.totalExpenses) || 0;
                    const percentage = total > 0 ? (item.amount / total) * 100 : 0;

                    return (
                      <div key={item.category}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {item.category}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.count} {item.count === 1 ? "expense" : "expenses"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                              {money(item.amount)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {number(percentage)}%
                            </p>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              index % 4 === 0 ? "bg-blue-500" :
                              index % 4 === 1 ? "bg-amber-500" :
                              index % 4 === 2 ? "bg-violet-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                    <FileText size={25} />
                  </div>
                  <p className="mt-3 font-semibold text-slate-700">No expenses yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Record your first expense to see the breakdown.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Financial snapshot</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    How sales turn into operating profit
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <ChartNoAxesCombined size={20} />
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Net sales", amount: summary?.netSales, color: "bg-blue-500" },
                  { label: "Product costs", amount: summary?.costOfGoodsSold, color: "bg-amber-500" },
                  { label: "Gross profit", amount: summary?.grossProfit, color: "bg-emerald-500" },
                  { label: "Business expenses", amount: summary?.totalExpenses, color: "bg-rose-500" },
                ].map((item) => {
                  const sales = Number(summary?.netSales) || 0;
                  const width = sales > 0
                    ? Math.min(100, Math.abs(Number(item.amount) || 0) / sales * 100)
                    : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{item.label}</span>
                        <span className="text-sm font-bold text-slate-900">
                          {money(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-600">
                      Tax collected (excluded from sales)
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {money(summary?.taxCollected)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Tax is shown separately and is not treated as shop revenue in this calculation.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="font-bold text-slate-900">Expense records</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {pagination.total || 0} records matching your filters
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportCSV}
                  disabled={!expenses.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search expenses, payees or references..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-4 font-semibold">Expense</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Paid to</th>
                    <th className="px-5 py-4 font-semibold">Payment</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 text-right font-semibold">Amount</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-slate-500">
                        <LoaderCircle className="mx-auto mb-3 animate-spin text-blue-600" size={25} />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Receipt size={23} />
                        </div>
                        <p className="mt-3 font-semibold text-slate-800">No expenses found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Change your filters or record a new expense.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense._id} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{expense.title}</p>
                          {expense.reference && (
                            <p className="mt-1 text-xs text-slate-400">
                              Ref: {expense.reference}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {expense.paidTo || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {expense.paymentMethod || "Cash"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {localDate(expense.expenseDate)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {money(expense.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setModal({ ...expense })}
                              title="Edit expense"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => deleteExpense(expense)}
                              title="Delete expense"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Page {pagination.page || 1} of {Math.max(1, pagination.pages || 1)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  disabled={page >= (pagination.pages || 1) || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <p className="text-xs leading-5 text-slate-400">
            Profit is calculated from saved sale records and recorded expenses for the selected dates.
            It is an operational estimate and may not include supplier balances, unsold inventory,
            owner withdrawals, or other unrecorded costs.
          </p>
        </>
      )}

      {modal && (
        <ExpenseModal
          key={modal._id || "new-expense"}
          initial={modal._id ? modal : null}
          onClose={() => !saving && setModal(null)}
          onSave={saveExpense}
          saving={saving}
        />
      )}
    </div>
  );
}
