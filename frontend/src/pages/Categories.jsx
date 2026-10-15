
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  FolderOpen,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Tags,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  description: "",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    "Something went wrong. Please try again."
  );
}

function getCategoryList(response) {
  const data = response.data?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(response.data?.categories)) {
    return response.data.categories;
  }
  return [];
}

export default function Categories() {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canManage = ["owner", "manager"].includes(user?.role);

  const loadCategories = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/categories");
      setCategories(getCategoryList(response));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Could not load categories",
        text: getErrorMessage(error),
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      description: category.description || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingCategory(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      await Swal.fire({
        icon: "warning",
        title: "Category name required",
        text: "Enter a name for this category.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = { name, description };

      if (editingCategory) {
        await api.patch(
          `/categories/${editingCategory._id}`,
          payload
        );
      } else {
        await api.post("/categories", payload);
      }

      setModalOpen(false);
      setEditingCategory(null);
      setForm(emptyForm);

      await Swal.fire({
        icon: "success",
        title: editingCategory ? "Category updated" : "Category created",
        text: editingCategory
          ? "Your category has been updated."
          : "Your new category is ready to use.",
        timer: 1600,
        showConfirmButton: false,
      });

      await loadCategories();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Could not save category",
        text: getErrorMessage(error),
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (category) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Archive this category?",
      text: `Are you sure you want to archive "${category.name}"? Products already assigned to it may still reference it.`,
      showCancelButton: true,
      confirmButtonText: "Archive category",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/categories/${category._id}/archive`);

      await Swal.fire({
        icon: "success",
        title: "Category archived",
        timer: 1400,
        showConfirmButton: false,
      });

      await loadCategories();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Could not archive category",
        text: getErrorMessage(error),
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = [
      category.name,
      category.description,
    ].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    );

    const archived =
      category.isArchived === true ||
      category.status === "archived" ||
      category.isActive === false;

    return (
      matchesSearch &&
      (showArchived ? archived : !archived)
    );
  });

  const activeCount = categories.filter(
    (category) =>
      category.isArchived !== true &&
      category.status !== "archived" &&
      category.isActive !== false
  ).length;

  const archivedCount = categories.length - activeCount;

  return (
    <div className="min-h-full space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Tags size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Categories
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Organise your hardware products into groups.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add category
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active categories
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {activeCount}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FolderOpen size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Archived categories
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {archivedCount}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Archive size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                !showArchived
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                showArchived
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Status</th>
                {canManage && (
                  <th className="px-5 py-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-5 py-16 text-center"
                  >
                    <LoaderCircle
                      size={25}
                      className="mx-auto animate-spin text-blue-600"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading categories...
                    </p>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Tags size={24} />
                    </div>
                    <p className="mt-3 font-semibold text-slate-800">
                      {search
                        ? "No matching categories"
                        : showArchived
                          ? "No archived categories"
                          : "No categories yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {search
                        ? "Try a different search term."
                        : "Create your first category to organise your products."}
                    </p>
                    {!search && !showArchived && canManage && (
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus size={17} />
                        Add your first category
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => {
                  const archived =
                    category.isArchived === true ||
                    category.status === "archived" ||
                    category.isActive === false;

                  return (
                    <tr
                      key={category._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Tags size={19} />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {category.name}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                        {category.description || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            archived
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {archived ? "Archived" : "Active"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(category)}
                              title="Edit category"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={16} />
                            </button>
                            {!archived && (
                              <button
                                type="button"
                                onClick={() => handleArchive(category)}
                                title="Archive category"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                <Archive size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Showing {filteredCategories.length} of {categories.length} categories
          </p>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCategory ? "Edit category" : "Create category"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use a clear name your staff will recognise.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="categoryName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Category name <span className="text-red-500">*</span>
                </label>
                <input
                  id="categoryName"
                  name="name"
                  required
                  maxLength={100}
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Plumbing"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="categoryDescription"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="categoryDescription"
                  name="description"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional details about this category..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingCategory
                      ? "Save changes"
                      : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
