
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Store } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, user, loading, shop } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login unsuccessful",
        text:
          error.response?.data?.message ||
          "Unable to sign in. Check your connection and try again.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#101a30] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500">
            <Store size={25} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">
              {shop?.name || "Hardware Shop"}
            </p>
            <p className="text-xs text-slate-400">
              BUSINESS MANAGEMENT
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">
            Your business, organized
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Everything your hardware shop needs, in one place.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            Manage products, keep track of stock, create bills and
            understand your business finances from a single workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/15 px-4 py-2">
              Inventory
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              Billing
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              Customer credit
            </span>
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          Secure access for your business team.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Store size={23} />
            </div>
            <span className="font-bold text-slate-900">
              {shop?.name || "Hardware Shop"}
            </span>
          </div>

          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <LockKeyhole size={27} />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to access your shop management workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in to your account"}
            </button>
          </form>

          
<div className="mt-7 text-center">
  <p className="text-sm text-slate-500">
    Setting up your shop for the first time?
  </p>
  <Link
    to="/register"
    className="mt-2 inline-flex items-center justify-center font-semibold text-blue-600 transition hover:text-blue-700"
  >
    Create your shop account
    <span className="ml-1" aria-hidden="true">→</span>
  </Link>
</div>

<p className="mt-6 text-center text-xs leading-5 text-slate-400">
  Authorized shop personnel only. Contact your shop owner if you
  need access.
</p>

        </div>
      </section>
    </main>
  );
}
