
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ShoppingCart,
  ReceiptText,
  Users,
  Truck,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Store,
  Bell,
} from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";

const navigation = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Products", path: "/products", icon: Package },
  { label: "Categories", path: "/categories", icon: Tags },
  { label: "Inventory", path: "/inventory", icon: Boxes },
  { label: "Point of Sale", path: "/pos", icon: ShoppingCart },
  { label: "Sales & Invoices", path: "/sales", icon: ReceiptText },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Suppliers", path: "/suppliers", icon: Truck },
  
  { label: "Expenses", path: "/expenses", icon: Wallet },
  { label: "Reports", path: "/reports", icon: ChartNoAxesCombined },
  
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, shop, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage =
    navigation.find((item) => item.path === location.pathname)?.label ||
    "Workspace";

  async function handleLogout() {
    const result = await Swal.fire({
      title: "Sign out?",
      text: "You'll need to sign in again to access your shop.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sign out",
      cancelButtonText: "Stay here",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    logout();
    navigate("/login", { replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#101a30] text-slate-300">
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {shop?.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt="Shop logo"
              className="h-10 w-10 rounded-xl bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
              <Store size={21} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {shop?.name || "Hardware Shop"}
            </p>
            <p className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-slate-500">
              MANAGEMENT SYSTEM
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-4 pb-2 pt-6">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Main menu
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[0.05] p-3">
          <p className="truncate text-sm font-medium text-white">
            {user?.name || "Shop User"}
          </p>
          <p className="mt-1 truncate text-xs capitalize text-slate-400">
            {user?.role || "Staff"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {currentPage}
              </h1>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                Manage your business with confidence.
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications will be connected to the alerts module"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
            >
              <Bell size={18} />
            </button>

            <div className="h-8 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-32 truncate text-xs font-semibold text-slate-800">
                  {user?.name}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-slate-500">
                  {user?.role}
                </p>
              </div>
              <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-7 lg:p-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
