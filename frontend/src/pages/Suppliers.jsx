
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Building2,
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
  Truck,
  Package,
  Tags,
  UserRound,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  companyName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  categoriesText: "",
  notes: "",
};

const getError = (error) =>
  error?.response?.data?.message || "Something went wrong. Please try again.";

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(date));
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

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

function SupplierModal({ title, subtitle, onClose, children, footer }) {
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
            aria-label="Close dialog"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

function SupplierAvatar({ supplier }) {
  const initials = (supplier.name || "S")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">
      {supplier.companyName ? <Building2 size={20} /> : initials}
    </div>
  );
}

function WhatsAppLink({ phone, name }) {
  const digits = (phone || "").replace(/\D/g, "");
  const internationalNumber = digits.startsWith("0")
    ? `92${digits.slice(1)}`
    : digits;

  if (!internationalNumber) {
    return <span className="text-sm text-slate-400">No phone number</span>;
  }

  return (
    <a
      href={`https://wa.me/${internationalNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Message ${name} on WhatsApp`}
      className="font-medium text-slate-700 transition hover:text-emerald-600 hover:underline"
    >
      {phone}
    </a>
  );
}

export default function Suppliers() {
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadSuppliers = useCallback(
    async (page = 1, quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const params = { page, limit: 20, status };

        if (search) params.search = search;

        const response = await api.get("/suppliers", { params });
        const payload = response.data;

        setSuppliers(Array.isArray(payload.data) ? payload.data : []);
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
          title: "Could not load suppliers",
          text: getError(error),
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status]
  );

  useEffect(() => {
    const timer = setTimeout(() => loadSuppliers(1), 250);
    return () => clearTimeout(timer);
  }, [loadSuppliers]);

  const updateForm = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditingSupplier(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      companyName: supplier.companyName || "",
      phone: supplier.phone || "",
      alternatePhone: supplier.alternatePhone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      categoriesText: (supplier.suppliedCategories || []).join(", "),
      notes: supplier.notes || "",
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
        text: "Supplier name and phone number are required.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const suppliedCategories = [
      ...new Set(
        form.categoriesText
          .split(",")
          .map((category) => category.trim())
          .filter(Boolean)
      ),
    ];

    setSaving(true);

    try {
      const body = {
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        suppliedCategories,
        notes: form.notes.trim(),
      };

      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier._id}`, body);
      } else {
        await api.post("/suppliers", body);
      }

      setModalOpen(false);

      await Swal.fire({
        icon: "success",
        title: editingSupplier ? "Supplier updated" : "Supplier added",
        timer: 1400,
        showConfirmButton: false,
      });

      await loadSuppliers(1, true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Could not save supplier",
        text: getError(error),
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (supplier) => {
    const archived = supplier.isArchived;

    const result = await Swal.fire({
      icon: "question",
      title: archived ? "Restore supplier?" : "Archive supplier?",
      text: archived
        ? `${supplier.name} will appear in the active supplier list again.`
        : `${supplier.name} will be hidden from active suppliers. Their record will be retained.`,
      showCancelButton: true,
      confirmButtonText: archived ? "Restore" : "Archive",
      cancelButtonText: "Cancel",
      confirmButtonColor: archived ? "#2563eb" : "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/suppliers/${supplier._id}/archive`);
      await loadSuppliers(pagination.page, true);

      Swal.fire({
        icon: "success",
        title: archived ? "Supplier restored" : "Supplier archived",
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
    setStatus("active");
  };

  const canArchive = ["owner", "manager"].includes(user?.role);

  const categoryCount = new Set(
    suppliers.flatMap((supplier) => supplier.suppliedCategories || [])
  ).size;

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
            <Truck size={15} />
            Supplier management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Suppliers
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage vendors and keep your supply network organized.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadSuppliers(pagination.page, true)}
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
            Add supplier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {status === "archived" ? "Archived suppliers" : "Suppliers on page"}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : suppliers.length}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {pagination.total} matching records
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Truck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Categories represented on page
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : categoryCount}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Distinct supplied categories
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Tags size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Suppliers with contact details
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : suppliers.filter((supplier) => supplier.phone).length}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Available on this page
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by supplier, company, phone, city or category..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="active">Active suppliers</option>
              <option value="archived">Archived suppliers</option>
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
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Supplied categories</th>
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
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Truck size={26} />
                    </div>
                    <p className="font-semibold text-slate-800">
                      No suppliers found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first supplier or adjust your search.
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus size={16} /> Add supplier
                    </button>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier._id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <SupplierAvatar supplier={supplier} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {supplier.name}
                          </p>
                          {supplier.companyName && (
                            <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                              {supplier.companyName}
                            </p>
                          )}
                          {supplier.supplierNumber && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              {supplier.supplierNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="shrink-0 text-emerald-500" />
                        <WhatsAppLink phone={supplier.phone} name={supplier.name} />
                      </div>
                      {supplier.email && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <Mail size={13} className="shrink-0 text-slate-400" />
                          <span className="max-w-44 truncate">{supplier.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} className="shrink-0 text-slate-400" />
                        {[supplier.city, supplier.address].filter(Boolean).join(", ") || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-64 flex-wrap gap-1.5">
                        {(supplier.suppliedCategories || []).length ? (
                          supplier.suppliedCategories.slice(0, 3).map((category) => (
                            <span
                              key={category}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                            >
                              <Package size={12} />
                              {category}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">Not specified</span>
                        )}

                        {(supplier.suppliedCategories || []).length > 3 && (
                          <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                            +{supplier.suppliedCategories.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(supplier.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(supplier)}
                          title="Edit supplier"
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil size={15} />
                        </button>

                        {canArchive && (
                          <button
                            type="button"
                            onClick={() => handleArchive(supplier)}
                            title={supplier.isArchived ? "Restore supplier" : "Archive supplier"}
                            className={`rounded-lg border p-2 transition ${
                              supplier.isArchived
                                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                : "border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            }`}
                          >
                            {supplier.isArchived ? (
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
              {suppliers.length
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}
              {"–"}
              {(pagination.page - 1) * pagination.limit + suppliers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {pagination.total}
            </span>{" "}
            suppliers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadSuppliers(pagination.page - 1)}
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
              onClick={() => loadSuppliers(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <SupplierModal
          title={editingSupplier ? "Edit supplier" : "Add new supplier"}
          subtitle="Keep supplier contacts and product categories organized."
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
                form="supplier-form"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingSupplier
                    ? "Save changes"
                    : "Add supplier"}
              </button>
            </>
          }
        >
          <form id="supplier-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Supplier information
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Supplier name *">
                  <input
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Muhammad Asif"
                    className={inputClass}
                  />
                </Field>

                <Field label="Company / business">
                  <input
                    maxLength={150}
                    value={form.companyName}
                    onChange={(event) => updateForm("companyName", event.target.value)}
                    placeholder="e.g. Asif Steel Traders"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Contact details
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
                    placeholder="supplier@example.com"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Location and supply categories
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
                    placeholder="Market, street, area"
                    className={inputClass}
                  />
                </Field>

                <Field label="Supplied categories" className="sm:col-span-2">
                  <input
                    value={form.categoriesText}
                    onChange={(event) => updateForm("categoriesText", event.target.value)}
                    placeholder="Steel, Cement, Pipes, Electrical"
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-xs text-slate-400">
                    Separate categories with commas.
                  </span>
                </Field>

                <Field label="Notes" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Payment terms, delivery details, or other notes..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>
          </form>
        </SupplierModal>
      )}
    </div>
  );
}
