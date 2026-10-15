
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  CreditCard,
  Banknote,
  Printer,
  RotateCcw,
  CheckCircle2,
  X,
  Clock,
  AlertCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 3,
  }).format(Number(value || 0));

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const paymentLabels = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  mobile_wallet: "Mobile wallet",
};

const safeFilename = (value) =>
  String(value || "Invoice")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 100) || "Invoice";

export default function POS() {
  const { shop, user } = useAuth();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [siteName, setSiteName] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      let currentPage = 1;
      let totalPages = 1;
      const allProducts = [];

      do {
        const response = await api.get("/products", {
          params: {
            page: currentPage,
            limit: 100,
            search: search.trim() || undefined,
          },
        });

        const pageProducts = response.data.data;

        if (Array.isArray(pageProducts)) {
          allProducts.push(...pageProducts);
        }

        totalPages = Math.max(
          1,
          Number(response.data.pagination?.pages || 1)
        );

        currentPage += 1;
      } while (currentPage <= totalPages);

      setProducts(allProducts);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Products could not be loaded",
        text:
          error.response?.data?.message ||
          "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const subtotal = useMemo(
    () =>
      roundMoney(
        cart.reduce(
          (sum, item) => sum + item.salePrice * item.quantity,
          0
        )
      ),
    [cart]
  );

  const discountValue = Number(discount);
  const safeDiscount = Math.min(
    subtotal,
    Math.max(0, Number.isFinite(discountValue) ? discountValue : 0)
  );

  const taxRate = shop?.taxEnabled ? Number(shop.taxRate || 0) : 0;
  const taxableAmount = Math.max(0, roundMoney(subtotal - safeDiscount));
  const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
  const total = roundMoney(taxableAmount + taxAmount);

  // An empty field defaults to full payment.
  // Enter 0 for an entirely unpaid sale.
  const enteredPayment =
    amountPaid.trim() === "" ? total : Number(amountPaid);

  const validPaymentInput =
    Number.isFinite(enteredPayment) && enteredPayment >= 0;

  const paymentReceived = validPaymentInput
    ? Math.min(total, roundMoney(enteredPayment))
    : 0;

  const remainingPayment = roundMoney(
    Math.max(0, total - paymentReceived)
  );

  // Change is only returned for cash transactions.
  const changeDue =
    paymentMethod === "cash" && validPaymentInput
      ? roundMoney(Math.max(0, enteredPayment - total))
      : 0;

  const paymentStatus =
    remainingPayment <= 0
      ? "paid"
      : paymentReceived > 0
        ? "partial"
        : "unpaid";

  function addToCart(product) {
    if (!product.stockTrackingEnabled) {
      Swal.fire(
        "Stock tracking disabled",
        "Enable stock tracking before selling this product.",
        "warning"
      );
      return;
    }

    if (product.currentStock == null) {
      Swal.fire(
        "Stock unknown",
        "Record the opening stock for this product first.",
        "warning"
      );
      return;
    }

    if (Number(product.currentStock) <= 0) {
      Swal.fire(
        "Out of stock",
        "This product currently has no available stock.",
        "warning"
      );
      return;
    }

    setLastSale(null);

    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);

      if (existing) {
        if (existing.quantity + 1 > Number(product.currentStock)) {
          Swal.fire(
            "Stock limit",
            "You cannot add more than the available stock.",
            "warning"
          );
          return current;
        }

        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          _id: product._id,
          name: product.name,
          sku: product.sku || "",
          unit: product.unit || "piece",
          salePrice: Number(product.salePrice),
          currentStock: Number(product.currentStock),
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId, nextQuantity) {
    setCart((current) =>
      current.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity: Math.min(
                item.currentStock,
                Math.max(0.001, Number(nextQuantity) || 0.001)
              ),
            }
          : item
      )
    );
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item._id !== productId));
  }

  function resetCheckout() {
    setCart([]);
    setDiscount("0");
    setAmountPaid("");
    setCustomerName("");
    setCustomerPhone("");
    setSiteName("");
    setPaymentMethod("cash");
  }

  async function completeSale() {
    if (!cart.length) {
      await Swal.fire(
        "Cart is empty",
        "Add at least one product before checkout.",
        "info"
      );
      return;
    }

    if (
      discount.trim() === "" ||
      !Number.isFinite(Number(discount)) ||
      Number(discount) < 0
    ) {
      await Swal.fire(
        "Invalid discount",
        "Enter a valid, non-negative discount amount.",
        "warning"
      );
      return;
    }

    if (Number(discount) > subtotal) {
      await Swal.fire(
        "Invalid discount",
        "The discount cannot exceed the subtotal.",
        "warning"
      );
      return;
    }

    const paid = amountPaid.trim() === "" ? total : Number(amountPaid);

    if (!Number.isFinite(paid) || paid < 0) {
      await Swal.fire(
        "Invalid payment",
        "Enter an amount of zero or more.",
        "warning"
      );
      return;
    }

    if (paymentMethod !== "cash" && paid > total) {
      await Swal.fire(
        "Check payment",
        "For non-cash payments, the amount cannot exceed the bill total.",
        "warning"
      );
      return;
    }

    const appliedPayment = roundMoney(Math.min(paid, total));
    const balance = roundMoney(Math.max(0, total - appliedPayment));

    let confirmationText =
      `Total: ${money(total)}\n` +
      `Received: ${money(appliedPayment)}\n` +
      `Remaining: ${money(balance)}`;

    if (balance > 0 && !customerName.trim()) {
      const result = await Swal.fire({
        title: "Customer name recommended",
        text:
          "This sale has an outstanding balance. Add a customer name so you can identify who owes the money.",
        icon: "warning",
        input: "text",
        inputLabel: "Customer name",
        inputPlaceholder: "Enter customer name",
        showCancelButton: true,
        confirmButtonText: "Continue sale",
        cancelButtonText: "Go back",
        confirmButtonColor: "#2563eb",
      });

      if (!result.isConfirmed) return;

      if (result.value?.trim()) {
        setCustomerName(result.value.trim());
      }
    }

    const confirmation = await Swal.fire({
      title:
        balance === 0
          ? "Complete fully paid sale?"
          : appliedPayment > 0
            ? "Complete partially paid sale?"
            : "Complete unpaid sale?",
      text: confirmationText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm sale",
      cancelButtonText: "Review cart",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    setCheckingOut(true);

    try {
      const response = await api.post("/pos/checkout", {
        items: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        discount: Number(discount),
        paymentMethod,
        amountPaid: appliedPayment,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        siteName: siteName.trim(),
      });

      const sale = response.data.data.sale;

      const completedSale = {
        ...sale,
        siteName: sale.siteName ?? siteName.trim(),
        amountPaid: sale.amountPaid ?? appliedPayment,
        remainingBalance:
          sale.remainingBalance ??
          sale.balanceDue ??
          sale.remainingPayment ??
          balance,
        paymentStatus: sale.paymentStatus ?? paymentStatus,
        changeDue:
          sale.changeDue ??
          (paymentMethod === "cash"
            ? roundMoney(Math.max(0, paid - total))
            : 0),
      };

      setLastSale(completedSale);
      resetCheckout();
      await loadProducts();

      await Swal.fire({
        icon: "success",
        title: "Sale completed",
        html: `
         
<div style="text-align: center; width: 100%;">
  <p><strong>Invoice:</strong> ${String(
    sale.invoiceNumber || ""
  )}</p>
  <p><strong>Total:</strong> ${money(total)}</p>
  <p><strong>Received:</strong> ${money(appliedPayment)}</p>
  <p><strong>Remaining:</strong> ${money(balance)}</p>
  <p><strong>Status:</strong> ${
    balance <= 0
      ? "Paid"
      : appliedPayment > 0
        ? "Partially paid"
        : "Unpaid"
  }</p>
</div>

        `,
        confirmButtonColor: "#2563eb",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Checkout failed",
        text:
          error.response?.data?.message ||
          "The sale could not be completed. Please try again.",
      });

      await loadProducts();
    } finally {
      setCheckingOut(false);
    }
  }

  function printReceipt(sale = lastSale) {
    if (!sale) return;

    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]);

    const rows = (sale.items || [])
      .map(
        (item) => `
          <tr>
            <td>
              ${escapeHtml(item.name)}
              <br />
              <small>${escapeHtml(item.sku)}</small>
            </td>
            <td class="right">
              ${number(item.quantity)} ${escapeHtml(item.unit)}
            </td>
            <td class="right">${money(item.unitPrice)}</td>
            <td class="right">${money(item.lineTotal)}</td>
          </tr>`
      )
      .join("");

    const filename = safeFilename(
      sale.siteName || sale.invoiceNumber || "Invoice"
    );

    const receiptWindow = window.open("", "_blank", "width=500,height=750");

    if (!receiptWindow) {
      Swal.fire(
        "Pop-up blocked",
        "Allow pop-ups to print the receipt.",
        "warning"
      );
      return;
    }

    const saleTotal = Number(sale.total ?? total);
    const salePaid = Number(sale.amountPaid ?? paymentReceived);
    const saleBalance = Number(
      sale.remainingBalance ??
        sale.balanceDue ??
        sale.remainingPayment ??
        Math.max(0, saleTotal - salePaid)
    );

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(filename)}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              margin: 24px;
              font-size: 12px;
            }
            h1 { margin: 0 0 4px; font-size: 22px; }
            h2 { font-size: 17px; }
            p { margin: 4px 0; overflow-wrap: anywhere; }
            .center { text-align: center; }
            .muted { color: #6b7280; }
            hr {
              border: 0;
              border-top: 1px dashed #9ca3af;
              margin: 16px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              padding: 7px 3px;
              border-bottom: 1px solid #e5e7eb;
              text-align: left;
              vertical-align: top;
            }
            th { font-size: 10px; text-transform: uppercase; }
            .right { text-align: right; white-space: nowrap; }
            .totals { margin-top: 14px; }
            .total { font-size: 17px; font-weight: bold; }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin: 7px 0;
            }
            .row span:last-child,
            .row strong { text-align: right; }
            .site {
              margin: 12px 0;
              padding: 10px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              text-align: left;
              overflow-wrap: anywhere;
            }
            .balance {
              margin-top: 12px;
              padding: 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
            }
            .footer { text-align: center; margin-top: 24px; }
            @media print {
              body { margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>${escapeHtml(shop?.name || "Hardware Shop")}</h1>
            <p>${escapeHtml(shop?.address || "")}</p>
            <p>${escapeHtml(shop?.phone || "")}</p>
            <hr />
            <h2>SALES RECEIPT</h2>
            <p><strong>${escapeHtml(sale.invoiceNumber || "")}</strong></p>
            <p>
              ${escapeHtml(
                sale.createdAt
                  ? new Date(sale.createdAt).toLocaleString("en-PK", {
                      timeZone: shop?.timezone || "Asia/Karachi",
                    })
                  : new Date().toLocaleString("en-PK", {
                      timeZone: shop?.timezone || "Asia/Karachi",
                    })
              )}
            </p>
          </div>

          <hr />

          <div class="site">
            <strong>Site / Project:</strong>
            <p>${escapeHtml(sale.siteName || "Not specified")}</p>
          </div>

          <p>
            <strong>Customer:</strong>
            ${escapeHtml(sale.customerName || "Walk-in customer")}
          </p>
          <p>
            <strong>Phone:</strong>
            ${escapeHtml(sale.customerPhone || "—")}
          </p>
          <p><strong>Cashier:</strong> ${escapeHtml(user?.name || "Staff")}</p>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>Subtotal</span>
              <strong>${money(sale.subtotal)}</strong>
            </div>
            <div class="row">
              <span>Discount</span>
              <strong>${money(sale.discount)}</strong>
            </div>
            <div class="row">
              <span>Tax (${number(sale.taxRate)}%)</span>
              <strong>${money(sale.taxAmount)}</strong>
            </div>
            <hr />
            <div class="row total">
              <span>TOTAL</span>
              <span>${money(saleTotal)}</span>
            </div>
            <div class="row">
              <span>Payment method</span>
              <strong>
                ${escapeHtml(
                  paymentLabels[sale.paymentMethod] ||
                    sale.paymentMethod ||
                    "—"
                )}
              </strong>
            </div>
            <div class="row">
              <span>Amount paid</span>
              <strong>${money(salePaid)}</strong>
            </div>
            <div class="row">
              <span>Change</span>
              <strong>${money(sale.changeDue)}</strong>
            </div>
          </div>

          <div class="balance">
            <div class="row">
              <strong>Remaining payment</strong>
              <strong>${money(saleBalance)}</strong>
            </div>
            <div class="row">
              <span>Payment status</span>
              <strong>${
                saleBalance <= 0
                  ? "Paid"
                  : salePaid > 0
                    ? "Partially paid"
                    : "Unpaid"
              }</strong>
            </div>
          </div>

          <div class="footer">
            <hr />
            <p><strong>Thank you for your purchase!</strong></p>
            <p class="muted">Please keep this receipt for your records.</p>
          </div>

          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  return (
    <div className="min-h-full space-y-5 pb-8 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Sales terminal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Point of Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search products, build a cart, and accept full or partial payments.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {shop?.name || "Your shop"}
        </div>
      </div>

      {lastSale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                Last sale completed
              </p>
              <p className="text-sm text-emerald-700">
                {lastSale.invoiceNumber} · {money(lastSale.total)}
                {lastSale.siteName ? ` · ${lastSale.siteName}` : ""}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-800">
                Paid: {money(lastSale.amountPaid ?? lastSale.total)} ·
                Remaining:{" "}
                {money(
                  lastSale.remainingBalance ??
                    lastSale.balanceDue ??
                    lastSale.remainingPayment ??
                    0
                )}
              </p>
            </div>
          </div>

         
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product name, SKU, barcode or brand..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Products</h2>
              <p className="text-xs text-slate-500">
                Select a product to add it to the cart.
              </p>
            </div>

            <button
              onClick={loadProducts}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <Package className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 font-semibold">No products found</p>
              <p className="mt-1 text-sm text-slate-500">
                Check your search, or add products from the Products page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => {
                const stock = Number(product.currentStock || 0);
                const canSell =
                  product.stockTrackingEnabled &&
                  product.currentStock != null &&
                  stock > 0;

                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={!canSell}
                    className="group flex min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        {product.image?.url ? (
                          <img
                            src={product.image.url}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-105"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-300" />
                        )}
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          !product.stockTrackingEnabled ||
                          product.currentStock == null
                            ? "bg-amber-50 text-amber-700"
                            : stock <= 0
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {product.currentStock == null
                          ? "Stock unknown"
                          : !product.stockTrackingEnabled
                            ? "Untracked"
                            : `${number(stock)} ${product.unit || "units"}`}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.sku || "No SKU"}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span className="text-sm font-bold text-slate-900">
                        {money(product.salePrice)}
                      </span>
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        
<aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:max-h-[900px]">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">Current sale</h2>
                <p className="text-xs text-slate-500">
                  {cart.length} product{cart.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Clear cart"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          
<div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Your cart is empty
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Choose products to start a sale.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {money(item.salePrice)} / {item.unit}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-lg border border-slate-200">
                      <button
                        onClick={() =>
                          item.quantity <= 1
                            ? removeFromCart(item._id)
                            : updateQuantity(item._id, item.quantity - 1)
                        }
                        className="p-2 text-slate-500 hover:bg-slate-50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <input
                        aria-label={`Quantity for ${item.name}`}
                        type="number"
                        min="0.001"
                        max={item.currentStock}
                        step="any"
                        value={item.quantity}
                        onChange={(event) =>
                          updateQuantity(item._id, event.target.value)
                        }
                        className="w-16 border-x border-slate-200 py-1 text-center text-sm font-semibold outline-none"
                      />

                      <button
                        disabled={item.quantity >= item.currentStock}
                        onClick={() =>
                          updateQuantity(item._id, item.quantity + 1)
                        }
                        className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-sm font-bold">
                      {money(item.salePrice * item.quantity)}
                    </p>
                  </div>

                  <p className="mt-1 text-right text-[11px] text-slate-400">
                    Available: {number(item.currentStock)} {item.unit}
                  </p>
                </div>
              ))
            )}
          </div>

          
<div className="shrink-0 space-y-3 overflow-y-auto border-t border-slate-100 bg-slate-50/70 p-4 xl:max-h-[58%]">

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Customer name{" "}
                
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  maxLength={150}
                  placeholder="Walk-in customer"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Phone{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  maxLength={30}
                  placeholder="03xx xxxxxxx"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-slate-600">
              Site name / Project{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                maxLength={150}
                placeholder="e.g. DHA Phase 2 — House 145"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500"
              />
              <span className="mt-1 block font-normal text-slate-400">
                This will be shown on the invoice.
              </span>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Discount (PKR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>−{money(safeDiscount)}</span>
              </div>

              {shop?.taxEnabled && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({number(taxRate)}%)</span>
                  <span>{money(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
                <span>Total due</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment method
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["cash", "Cash", Banknote],
                  ["card", "Card", CreditCard],
                  ["bank_transfer", "Bank transfer", CreditCard],
                  ["mobile_wallet", "Mobile wallet", CreditCard],
                ].map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                      paymentMethod === value
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Amount received (PKR)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  placeholder={total.toFixed(2)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmountPaid(total.toFixed(2))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  Full payment
                </button>

                <button
                  type="button"
                  onClick={() => setAmountPaid("0")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  Pay later
                </button>

                <button
                  type="button"
                  onClick={() => setAmountPaid("")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  Reset
                </button>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 ${
                paymentStatus === "paid"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {paymentStatus === "paid" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : paymentStatus === "partial" ? (
                  <Clock className="h-5 w-5 text-amber-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}

                <p
                  className={`text-sm font-bold ${
                    paymentStatus === "paid"
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {paymentStatus === "paid"
                    ? "Fully paid"
                    : paymentStatus === "partial"
                      ? "Partially paid"
                      : "Unpaid"}
                </p>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount received</span>
                  <span className="font-semibold">
                    {validPaymentInput ? money(paymentReceived) : "Invalid amount"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Remaining payment</span>
                  <span className="font-bold text-amber-800">
                    {validPaymentInput ? money(remainingPayment) : "—"}
                  </span>
                </div>

                {paymentMethod === "cash" && changeDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Change to return</span>
                    <span className="font-semibold text-emerald-700">
                      {money(changeDue)}
                    </span>
                  </div>
                )}
              </div>

              {remainingPayment > 0 && (
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  The outstanding balance must be saved by the backend and
                  displayed in your Remaining Payments section.
                </p>
              )}
            </div>

            <button
              onClick={completeSale}
              disabled={checkingOut || cart.length === 0 || !validPaymentInput}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingOut ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {checkingOut
                ? "Processing sale..."
                : `Complete sale · ${money(total)}`}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Inventory is updated when the sale succeeds. Later payments must
              not deduct stock again.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}