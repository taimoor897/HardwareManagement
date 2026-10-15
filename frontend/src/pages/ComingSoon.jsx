
import { ArrowLeft, Construction } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const modules = {
  "/categories": {
    title: "Categories",
    description: "Manage the product categories used throughout your catalogue.",
  },
  "/inventory": {
    title: "Inventory",
    description: "Opening counts, goods received, stock adjustments and inventory movement history.",
  },
  "/pos": {
    title: "Point of Sale",
    description: "A fast counter interface for product search, customer bills, payments and receipts.",
  },
  "/sales": {
    title: "Sales & Invoices",
    description: "Invoice history, payment allocations, returns and refunds.",
  },
  "/customers": {
    title: "Customers",
    description: "Customer profiles, purchase history, credit limits and Udhaar ledgers.",
  },
  "/suppliers": {
    title: "Suppliers",
    description: "Supplier contacts, balances, payment history and statements.",
  },
  "/purchases": {
    title: "Purchases",
    description: "Purchase orders, goods receiving, supplier invoices and payments.",
  },
  "/expenses": {
    title: "Expenses",
    description: "Operating expenses, cashbook entries and closing cash reconciliation.",
  },
  "/reports": {
    title: "Reports",
    description: "Sales, profit, inventory valuation, receivables and payables from actual records.",
  },
  "/settings": {
    title: "Settings",
    description: "Shop profile, invoice preferences, staff accounts, permissions and business configuration.",
  },
};

export default function ComingSoon() {
  const location = useLocation();
  const current = modules[location.pathname] || {
    title: "Module",
    description: "This module will be implemented in a future phase.",
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Construction size={28} />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          Development roadmap
        </p>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {current.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {current.description}
        </p>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          This module is not operational yet. It will be connected to the real
          backend as development progresses.
        </p>

        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
