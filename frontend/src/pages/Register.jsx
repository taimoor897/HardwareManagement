
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Store, UserRound, Mail, LockKeyhole } from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();

  const [form, setForm] = useState({
    shopName: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      await Swal.fire({
        icon: "warning",
        title: "Passwords don't match",
        text: "Enter the same password in both fields.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (form.password.length < 8) {
      await Swal.fire({
        icon: "warning",
        title: "Choose a stronger password",
        text: "Your password must contain at least 8 characters.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/register", {
        shopName: form.shopName.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // Establish the same session used by the regular login page.
      await login(form.email.trim().toLowerCase(), form.password);

      await Swal.fire({
        icon: "success",
        title: "Your shop is ready!",
        text: "Your owner account has been created successfully.",
        confirmButtonColor: "#2563eb",
      });

      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Could not create your account. Please check your connection and try again.";

      await Swal.fire({
        icon: "error",
        title: "Registration failed",
        text: message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen bg-white">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
            <Store size={23} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">HardwareOS</p>
            <p className="text-xs text-slate-400">Shop Management System</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300">
            Your shop, organised
          </span>
          <h1 className="mt-7 text-5xl font-bold leading-tight tracking-tight">
            Build a smarter way to run your shop.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
            Keep your products, stock, sales and shop operations organised
            in one workspace designed for hardware businesses.
          </p>

          <div className="mt-9 space-y-4 text-sm text-slate-300">
            {[
              "One place for your product catalogue",
              "Manage your shop with an owner account",
              "Designed for Pakistani hardware retailers",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          Simple operations. Better visibility. More control.
        </p>
      </section>

      <section className="flex w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Store size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-900">HardwareOS</p>
              <p className="text-xs text-slate-500">Shop Management System</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-blue-600">
            FIRST-TIME SETUP
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Create your shop
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set up your shop and create your owner account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="shopName" className="mb-2 block text-sm font-medium text-slate-700">
                Shop name
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="shopName"
                  name="shopName"
                  value={form.shopName}
                  onChange={updateField}
                  placeholder="e.g. Al Madina Hardware Store"
                  required
                  maxLength={150}
                  autoComplete="organization"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                Your full name
              </label>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="Enter your password again"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating your shop..." : "Create shop account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Registration is available only during initial shop setup.
          </p>
        </div>
      </section>
    </main>
  );
}
