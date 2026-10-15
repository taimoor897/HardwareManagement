
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Building2,
  UserRound,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Archive,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  UserCheck,
  BriefcaseBusiness,
  FileText,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const money = (value = 0) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const emptyForm = {
  name: "",
  customerType: "individual",
  companyName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  notes: "",
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(date));
};

const getError = (error) =>
  error?.response?.data?.message || "Something went wrong. Please try again.";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerAvatar({ customer, size = "normal" }) {
  const business = customer.customerType === "business";
  const initials = (customer.name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl font-bold ${
        size === "large" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm"
      } ${
        business
          ? "bg-violet-50 text-violet-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {business ? <Building2 size={size === "large" ? 25 : 20} /> : initials}
    </div>
  );
}

export default function Customers() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadCustomers = useCallback(
    async (page = 1, quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const params = { page, limit: 20, status };

        if (search) params.search = search;
        if (type !== "all") params.type = type;

        const response = await api.get("/customers", { params });
        const payload = response.data;

        setCustomers(Array.isArray(payload.data) ? payload.data : []);
        setPagination(
          payload.pagination || {
            page: 1,
            pages: 1,
            total: 0,
            limit: 20,
          }
        );
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Could not load customers",
          text: getError(error),
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, type]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const updateForm = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditingCustomer(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || "",
      customerType: customer.customerType || "individual",
      companyName: customer.companyName || "",
      phone: customer.phone || "",
      alternatePhone: customer.alternatePhone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      notes: customer.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (!saving) setModalOpen(false);
  }, [saving]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing information",
        text: "Customer name and phone number are required.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setSaving(true);

    try {
      const body = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
      };

      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer._id}`, body);
      } else {
        await api.post("/customers", body);
      }

      setModalOpen(false);

      await Swal.fire({
        icon: "success",
        title: editingCustomer ? "Customer updated" : "Customer added",
        text: editingCustomer
          ? "Customer information has been saved."
          : "The new customer has been added successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      await loadCustomers(1, true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Could not save customer",
        text: getError(error),
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (customer) => {
    const archived = customer.isArchived;

    const result = await Swal.fire({
      icon: "question",
      title: archived ? "Restore customer?" : "Archive customer?",
      text: archived
        ? `${customer.name} will appear in your active customer list again.`
        : `${customer.name} will be hidden from the active customer list. Their record will be retained.`,
      showCancelButton: true,
      confirmButtonText: archived ? "Restore" : "Archive",
      cancelButtonText: "Cancel",
      confirmButtonColor: archived ? "#2563eb" : "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/customers/${customer._id}/archive`);
      await loadCustomers(pagination.page, true);

      Swal.fire({
        icon: "success",
        title: archived ? "Customer restored" : "Customer archived",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Action failed",
        text: getError(error),
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const resetSearch = () => {
    setSearchInput("");
    setSearch("");
    setType("all");
    setStatus("active");
  };

  const role = user?.role;
  const canArchive = ["owner", "manager"].includes(role);

  const individualCount = customers.filter(
    (customer) => customer.customerType === "individual"
  ).length;

  const businessCount = customers.filter(
    (customer) => customer.customerType === "business"
  ).length;

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            <Users size={15} />
            Customer management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Customers
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Build stronger relationships with every customer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadCustomers(pagination.page, true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {status === "archived" ? "Archived customers" : "Customers on page"}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : customers.length}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {pagination.total} matching records
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Individual customers on page
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : individualCount}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Walk-in and personal buyers
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <UserRound size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Business customers on page
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : businessCount}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Contractors and companies
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <BriefcaseBusiness size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <form
            onSubmit={submitSearch}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by customer, phone, company or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All customer types</option>
              <option value="individual">Individuals</option>
              <option value="business">Businesses</option>
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="active">Active customers</option>
              <option value="archived">Archived customers</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>

            <button
              type="button"
              onClick={resetSearch}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Customer type</th>
                <th className="px-5 py-4">Added</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td className="px-5 py-5" key={cell}>
                        <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Users size={26} />
                    </div>
                    <p className="font-semibold text-slate-800">
                      No customers found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first customer or adjust your search filters.
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus size={16} /> Add customer
                    </button>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={customer} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {customer.name}
                          </p>
                          {customer.companyName && (
                            <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                              {customer.companyName}
                            </p>
                          )}
                          {customer.customerNumber && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              {customer.customerNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      
<div className="flex items-center gap-2 text-sm">
  <Phone size={14} className="shrink-0 text-emerald-500" />
  <a
    href={`https://wa.me/${(customer.phone || "").replace(/\D/g, "").replace(/^0/, "92")}`}
    target="_blank"
    rel="noopener noreferrer"
    title={`Chat with ${customer.name} on WhatsApp`}
    className="font-medium text-slate-700 transition hover:text-emerald-600 hover:underline"
  >
    {customer.phone}
  </a>
</div>

                      {customer.email && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <Mail size={13} className="shrink-0 text-slate-400" />
                          <span className="max-w-44 truncate">
                            {customer.email}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} className="shrink-0 text-slate-400" />
                        <span>
                          {[customer.city, customer.address]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                          customer.customerType === "business"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {customer.customerType === "business" ? (
                          <Building2 size={13} />
                        ) : (
                          <UserRound size={13} />
                        )}
                        {customer.customerType === "business"
                          ? "Business"
                          : "Individual"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(customer.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          title="Edit customer"
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil size={15} />
                        </button>

                        {canArchive && (
                          <button
                            type="button"
                            onClick={() => handleArchive(customer)}
                            title={customer.isArchived ? "Restore customer" : "Archive customer"}
                            className={`rounded-lg border p-2 transition ${
                              customer.isArchived
                                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                : "border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            }`}
                          >
                            {customer.isArchived ? (
                              <RotateCcw size={15} />
                            ) : (
                              <Archive size={15} />
                            )}
                          </button>
                        )}
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
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {customers.length ? (pagination.page - 1) * pagination.limit + 1 : 0}
              {"–"}
              {(pagination.page - 1) * pagination.limit + customers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {pagination.total}
            </span>{" "}
            customers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadCustomers(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="px-2 text-sm font-medium text-slate-600">
              {pagination.page} / {Math.max(1, pagination.pages)}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => loadCustomers(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editingCustomer ? "Edit customer" : "Add new customer"}
          subtitle="Keep your customer information accurate and up to date."
          onClose={closeModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingCustomer ? "Save changes" : "Add customer"}
              </button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Basic information
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer name *">
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    className={inputClass}
                  />
                </Field>

                <Field label="Customer type">
                  <select
                    value={form.customerType}
                    onChange={(event) => updateForm("customerType", event.target.value)}
                    className={inputClass}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business / Contractor</option>
                  </select>
                </Field>

                {form.customerType === "business" && (
                  <Field label="Company / business name" className="sm:col-span-2">
                    <input
                      maxLength={150}
                      value={form.companyName}
                      onChange={(event) => updateForm("companyName", event.target.value)}
                      placeholder="e.g. Khan Construction"
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Contact information
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number *">
                  <input
                    required
                    maxLength={25}
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="03XX XXXXXXX"
                    className={inputClass}
                  />
                </Field>

                <Field label="Alternate phone">
                  <input
                    maxLength={25}
                    value={form.alternatePhone}
                    onChange={(event) => updateForm("alternatePhone", event.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </Field>

                <Field label="Email address" className="sm:col-span-2">
                  <input
                    type="email"
                    maxLength={150}
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    placeholder="customer@example.com"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Address and notes
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    maxLength={100}
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    placeholder="e.g. Faisalabad"
                    className={inputClass}
                  />
                </Field>

                <Field label="Address">
                  <input
                    maxLength={500}
                    value={form.address}
                    onChange={(event) => updateForm("address", event.target.value)}
                    placeholder="Street, area, market"
                    className={inputClass}
                  />
                </Field>

                <Field label="Notes" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Preferences, site details, or other useful information..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
