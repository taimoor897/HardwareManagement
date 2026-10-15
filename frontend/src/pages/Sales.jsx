
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ReceiptText,
  RefreshCw,
  Eye,
  X,
  Printer,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Package,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const numeric = (value) => Number(value) || 0;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const paymentLabel = (method) => {
  const labels = {
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank Transfer",
    mobile_wallet: "Mobile Wallet",
  };

  return labels[method] || method || "—";
};

const paymentIcon = (method) => {
  if (method === "cash") return Banknote;
  if (method === "card") return CreditCard;
  if (method === "mobile_wallet") return Smartphone;
  return Building2;
};

const getRemaining = (sale) => {
  if (sale?.balanceDue != null) {
    return Math.max(0, numeric(sale.balanceDue));
  }

  const total = numeric(sale?.total);
  const paid =
    sale?.amountPaid == null ? total : numeric(sale.amountPaid);

  return Math.max(0, total - paid);
};

const getPaidAmount = (sale) => {
  if (sale?.amountPaid != null) {
    return Math.max(0, numeric(sale.amountPaid));
  }

  return numeric(sale?.total);
};

const getPaymentStatus = (sale) => {
  const remaining = getRemaining(sale);
  const paid = getPaidAmount(sale);

  if (remaining <= 0) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
};

const statusClasses = (status) => {
  if (status === "Paid") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
  }

  if (status === "Partially Paid") {
    return "bg-amber-50 text-amber-700 ring-amber-600/10";
  }

  return "bg-red-50 text-red-700 ring-red-600/10";
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

function buildInvoiceHtml(sale, shop, mode = "a4") {
  const e = escapeHtml;
  const isThermal = mode === "thermal";

  const shopAddress =
    "MAC 2 Plaza, Nearby Jahaz Chowk, Bahria Enclave, Islamabad";
  const shopPhone = "0349-7592536 | 0304-5803538";
  const shopLogo = "/logo1.png";

  const invoiceNumber = sale.invoiceNumber || "Invoice";
  const customerName = sale.customerName || "Walk-in Customer";
  const customerPhone = sale.customerPhone || "";

  const date = sale.createdAt
    ? new Date(sale.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      })
    : "—";

  const items = Array.isArray(sale.items) ? sale.items : [];
  const subtotal = numeric(sale.subtotal);
  const discount = numeric(sale.discount);
  const total = numeric(sale.total);
  const paid = getPaidAmount(sale);
  const balance = getRemaining(sale);

  const itemRows = items
    .map((item, index) => {
      const qty = numeric(item.quantity);
      const rate = numeric(item.unitPrice);
      const amount =
        item.lineTotal == null ? qty * rate : numeric(item.lineTotal);

      return `
        <tr>
          <td class="sr">${index + 1}</td>
          <td class="description">
            ${e(item.name || "Product")}
            ${item.sku ? `<small>SKU: ${e(item.sku)}</small>` : ""}
          </td>
          <td class="number">${qty.toFixed(2)}</td>
          <td class="number">${rate.toFixed(2)}</td>
          <td class="number">${amount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  const blankRows = Array.from(
    { length: Math.max(0, 6 - items.length) },
    (_, index) => `
      <tr class="blank-row">
        <td class="sr">${items.length + index + 1}</td>
        <td></td><td></td><td></td><td></td>
      </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${e(invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }

  @page {
    size: A4 portrait;
    margin: 10mm 8mm;
  }

  body {
    margin: 0;
    color: #191919;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .invoice { width: 100%; margin: auto; }

  .header {
    display: grid;
    grid-template-columns: 180px 1fr;
    align-items: center;
    gap: 18px;
    min-height: 190px;
    padding: 10px 0 18px;
  }

  .logo-wrap {
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .brand { text-align: center; }

  .brand-name {
    color: #eeb522;
    font-size: 48px;
    line-height: 1.1;
    font-weight: 800;
    margin: 0 0 12px;
  }

  .store-name {
    font-size: 23px;
    font-weight: 800;
    line-height: 1.2;
    margin: 0 0 15px;
  }

  .address {
    color: #777;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .phone {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.5;
  }

  .invoice-title {
    background: #191919;
    color: #fff;
    text-align: center;
    font-size: 25px;
    font-weight: 800;
    padding: 12px 8px;
    margin: 10px 0 24px;
  }

  .details {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .detail-row {
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr);
    align-items: stretch;
    min-height: 42px;
  }

  .detail-label {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .detail-value {
    display: flex;
    align-items: center;
    padding: 7px;
    min-width: 0;
    overflow-wrap: anywhere;
    background: #fff9e5;
    border-bottom: 1px solid #aaa;
    font-size: 14px;
  }

  .detail-value strong { font-size: 18px; }

 
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-bottom: 26px;
}

thead {
  display: table-header-group;
  background: #191919;
  color: white;
  border-top: 4px solid #efbb26;
  border-bottom: 4px solid #efbb26;
}

th,
td {
  box-sizing: border-box;
  vertical-align: middle;
  padding: 8px 10px;
  font-size: 14px;
}

th {
  padding-top: 11px;
  padding-bottom: 11px;
  text-align: left;
  white-space: nowrap;
}

th:nth-child(1),
td:nth-child(1) {
  width: 8%;
  text-align: center;
}

th:nth-child(2),
td:nth-child(2) {
  width: 40%;
  text-align: left;
}

th:nth-child(3),
td:nth-child(3) {
  width: 12%;
  text-align: right;
}

th:nth-child(4),
td:nth-child(4) {
  width: 18%;
  text-align: right;
}

th:nth-child(5),
td:nth-child(5) {
  width: 22%;
  text-align: right;
}

td {
  border-bottom: 1px solid #aaa;
  overflow-wrap: anywhere;
}

.description {
  text-align: left;
}

.description small {
  display: block;
  color: #777;
  font-size: 10px;
  margin-top: 3px;
}

.number {
  text-align: right;
  white-space: nowrap;
}

.blank-row td {
  height: 40px;
}


  .bottom { display: flex; justify-content: flex-end; }

  .summary { width: 50%; min-width: 320px; }

  .summary-row {
    display: grid;
    grid-template-columns: 1fr 125px;
    align-items: center;
    min-height: 40px;
    border-bottom: 1px solid #aaa;
    font-size: 14px;
  }

  .summary-label {
    text-align: right;
    padding: 7px 12px;
    font-weight: 700;
  }

  .summary-value {
    text-align: right;
    padding: 7px 5px;
    white-space: nowrap;
  }

  .grand-total {
    background: #fff9e5;
    font-weight: 800;
    border-top: 2px solid #e7d9a9;
  }

  .balance { color: #a51f32; font-weight: 800; }

  .notes {
    margin-top: 35px;
    display: flex;
    align-items: flex-end;
    gap: 5px;
    font-size: 13px;
  }

  .notes-line {
    flex: 1;
    height: 22px;
    border-bottom: 1px solid #888;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: 45px;
    font-size: 12px;
  }

  .signature {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    white-space: nowrap;
  }

  .signature-line {
    width: 130px;
    height: 20px;
    border-bottom: 1px solid #888;
  }

  .thank-you {
    margin-top: 35px;
    text-align: center;
    color: #d9ad2f;
    font-weight: 800;
    font-size: 18px;
    font-style: italic;
  }

  @media print {
    body { margin: 0; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
  }

  ${isThermal ? `
    @page { size: 80mm auto; margin: 3mm; }
    body { font-size: 10px; }
    .header { display: block; min-height: auto; padding: 0 0 10px; }
    .logo-wrap { width: 40mm; height: 28mm; margin: auto; }
    .brand-name { font-size: 25px; }
    .store-name { font-size: 13px; }
    .address, .phone { font-size: 10px; }
    .invoice-title { font-size: 12px; margin: 8px 0; }
    .details { display: block; margin-bottom: 10px; }
    .detail-row { grid-template-columns: 65px 1fr; min-height: 28px; }
    .detail-label, .detail-value { font-size: 10px; }
    .detail-value strong { font-size: 11px; }
    table { margin-bottom: 10px; }
    th, td { font-size: 9px; padding: 4px 2px; }
    .blank-row { display: none; }
    .summary { width: 100%; min-width: 0; }
    .summary-row { font-size: 10px; min-height: 25px; grid-template-columns: 1fr 80px; }
    .notes, .signatures { font-size: 9px; margin-top: 12px; }
    .signature-line { width: 40px; }
    .thank-you { font-size: 12px; margin-top: 12px; }
  ` : ""}
</style>
</head>
<body>
<main class="invoice">
  <header class="header">
    <div class="logo-wrap">
      <img class="logo" src="${e(shopLogo)}" alt="MIAN G logo">
    </div>
    <div class="brand">
      <h1 class="brand-name">MIAN G</h1>
      <div class="store-name">HARDWARE &amp; ELECTRIC STORE</div>
      <div class="address">${e(shopAddress)}</div>
      <div class="phone">Phone: ${e(shopPhone)}</div>
    </div>
  </header>

  <div class="invoice-title">SALES INVOICE / CASH MEMO</div>

  <section class="details">
    <div>
      <div class="detail-row">
        <div class="detail-label">Invoice:</div>
        <div class="detail-value"><strong>${e(invoiceNumber)}</strong></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Customer:</div>
        <div class="detail-value">${e(customerName)}</div>
      </div>
      ${sale.siteName ? `
        <div class="detail-row">
          <div class="detail-label">Site:</div>
          <div class="detail-value">${e(sale.siteName)}</div>
        </div>
      ` : ""}
    </div>
    <div>
      <div class="detail-row">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${e(date)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Phone:</div>
        <div class="detail-value">${e(customerPhone || "—")}</div>
      </div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Sr.</th>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Rate (Rs.)</th>
        <th>Amount (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blankRows}
    </tbody>
  </table>

  <section class="bottom">
    <div class="summary">
      <div class="summary-row">
        <div class="summary-label">Subtotal</div>
        <div class="summary-value">${subtotal.toFixed(2)}</div>
      </div>
      <div class="summary-row">
        <div class="summary-label">Discount</div>
        <div class="summary-value">${discount.toFixed(2)}</div>
      </div>
      <div class="summary-row grand-total">
        <div class="summary-label">Grand Total</div>
        <div class="summary-value">${total.toFixed(2)}</div>
      </div>
      <div class="summary-row">
        <div class="summary-label">Paid Amount</div>
        <div class="summary-value">${paid.toFixed(2)}</div>
      </div>
      <div class="summary-row balance">
        <div class="summary-label">Balance Due</div>
        <div class="summary-value">${balance.toFixed(2)}</div>
      </div>
    </div>
  </section>



  <div class="signatures">
    <div class="signature">
      <span>Customer Signature:</span>
      <div class="signature-line"></div>
    </div>
    <div class="signature">
      <span>Authorized Signature:</span>
      <div class="signature-line"></div>
    </div>
  </div>

  
</main>
<script>
  window.onload = () => {
    const images = Array.from(document.images);

    Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })).then(() => {
      window.focus();
      window.print();
    });
  };
</script>
</body>
</html>`;
}

function printSale(sale, shop, mode) {
  const printWindow = window.open("", "_blank", "width=950,height=850");

  if (!printWindow) {
    Swal.fire({
      icon: "warning",
      title: "Print window blocked",
      text: "Allow pop-ups for this site, then try printing again.",
    });

    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildInvoiceHtml(sale, shop, mode));
  printWindow.document.close();
}

function StatCard({ label, value, detail, icon: Icon, onClick }) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? `View ${label} details` : undefined}
      className={`w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition ${
        onClick
          ? "cursor-pointer hover:border-red-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>

          {onClick && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              Click to view outstanding sales →
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${
            onClick
              ? "bg-red-50 text-red-600"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </Component>
  );
}

export default function Sales() {
  const { shop } = useAuth();

  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRemainingPayments, setShowRemainingPayments] = useState(false);
  const [remainingSearch, setRemainingSearch] = useState("");

  const loadSales = useCallback(
    async (requestedPage = 1, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError("");

      try {
        const params = {
          page: requestedPage,
          limit: 20,
        };

        if (search.trim()) params.search = search.trim();
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;

        const response = await api.get("/pos/sales", { params });
        const payload = response.data || {};

        const rows = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.sales)
            ? payload.sales
            : [];

        const paginationData = payload.pagination || {};

        setSales(rows);

        setPagination({
          page: Number(paginationData.page) || requestedPage,
          limit: Number(paginationData.limit) || 20,
          total: Number(paginationData.total ?? rows.length),
          totalPages: Math.max(
            Number(
              paginationData.totalPages ??
                paginationData.pages ??
                payload.totalPages ??
                1
            ) || 1,
            1
          ),
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load sales history."
        );
        setSales([]);
        setPagination({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, fromDate, toDate]
  );

  useEffect(() => {
    loadSales(1);
  }, [loadSales]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const applyDates = (event) => {
    event.preventDefault();

    if (fromDate && toDate && fromDate > toDate) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "The start date must be before the end date.",
      });
      return;
    }

    loadSales(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  const refresh = () => {
    setRefreshing(true);
    loadSales(pagination.page, false);
  };

  const openSale = async (sale) => {
    setSelectedSale(sale);
    setDetailLoading(true);

    try {
      const response = await api.get(`/pos/sales/${sale._id}`);
      const payload = response.data || {};

      const saleData =
        payload.data?.sale ||
        payload.sale ||
        payload.data ||
        payload;

      if (saleData && saleData._id) {
        setSelectedSale(saleData);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Unable to load invoice",
        text:
          err.response?.data?.message ||
          "The saved sale could not be loaded.",
      });
    } finally {
      setDetailLoading(false);
    }
  };





const recordPayment = async (sale, settleAll = false) => {
  const remaining = getRemaining(sale);

  if (remaining <= 0) {
    Swal.fire({
      icon: "info",
      title: "Already paid",
      text: "This invoice has no outstanding balance.",
    });
    return;
  }

  const result = await Swal.fire({
    title: settleAll ? "Settle remaining balance" : "Record a payment",
    html: `
      <div style="text-align:left">
        <p style="margin-bottom:12px;color:#64748b;font-size:14px">
          Invoice: ${escapeHtml(sale.invoiceNumber || "")}
        </p>

        <label for="payment-amount"
          style="display:block;margin-bottom:6px;font-weight:600">
          Amount received (PKR)
        </label>
        <input
          id="payment-amount"
          type="number"
          min="0.01"
          max="${remaining.toFixed(2)}"
          step="0.01"
          value="${settleAll ? remaining.toFixed(2) : ""}"
          placeholder="Enter amount"
          class="swal2-input"
          style="width:100%;margin:0 0 16px"
        />

        <label for="payment-method"
          style="display:block;margin-bottom:6px;font-weight:600">
          Payment method
        </label>
        <select
          id="payment-method"
          class="swal2-select"
          style="width:100%;margin:0 0 16px"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_wallet">Mobile wallet</option>
        </select>

        <label for="payment-notes"
          style="display:block;margin-bottom:6px;font-weight:600">
          Notes (optional)
        </label>
        <textarea
          id="payment-notes"
          class="swal2-textarea"
          maxlength="500"
          placeholder="e.g. First installment"
          style="width:100%;margin:0"
        ></textarea>

        <p style="margin-top:12px;color:#64748b;font-size:13px">
          Outstanding balance: ${money(remaining)}
        </p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Save payment",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#059669",
    focusConfirm: false,
    preConfirm: () => {
      const amount = Number(
        document.getElementById("payment-amount")?.value
      );

      const method = document.getElementById("payment-method")?.value;
      const notes =
        document.getElementById("payment-notes")?.value?.trim() || "";

      if (!Number.isFinite(amount) || amount <= 0) {
        Swal.showValidationMessage("Enter an amount greater than zero.");
        return false;
      }

      if (amount > remaining + 0.001) {
        Swal.showValidationMessage(
          `The payment cannot exceed ${money(remaining)}.`
        );
        return false;
      }

      return { amount, method, notes };
    },
  });

  if (!result.isConfirmed || !result.value) return;

  try {
    const response = await api.post(
      `/pos/sales/${sale._id}/payments`,
      result.value
    );

    await loadSales(pagination.page, false);

    // Refresh the open invoice so its balance and history are current.
    if (selectedSale?._id === sale._id) {
      await openSale(sale);
    }

    // Also refresh an invoice opened from the outstanding-payments list.
    if (showRemainingPayments) {
      setShowRemainingPayments(false);
    }

    const updatedSale = response.data?.data?.sale;
    const newBalance = getRemaining(updatedSale || {
      ...sale,
      amountPaid: getPaidAmount(sale) + result.value.amount,
      balanceDue: remaining - result.value.amount,
    });

    await Swal.fire({
      icon: "success",
      title: "Payment recorded",
      text: newBalance <= 0
        ? "The invoice is now fully paid."
        : `Remaining balance: ${money(newBalance)}`,
      timer: 2200,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Could not record payment",
      text:
        err.response?.data?.message ||
        "Check your connection and try again.",
    });
  }
};

const markSaleAsPaid = async (sale) => {
  await recordPayment(sale, true);
};



  
const totalValue = sales.reduce(
  (sum, sale) => sum + getPaidAmount(sale),
  0
);


  const cashSales = sales.filter(
    (sale) => sale.paymentMethod === "cash"
  ).length;

  const remainingTotal = sales.reduce(
    (sum, sale) => sum + getRemaining(sale),
    0
  );

  const remainingSales = sales
    .filter((sale) => getRemaining(sale) > 0)
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    );

    const filteredRemainingSales = remainingSales.filter((sale) => {
  const query = remainingSearch.trim().toLowerCase();

  if (!query) return true;

  return [
    sale.customerName,
    sale.customerPhone,
    sale.invoiceNumber,
    sale.siteName,
  ].some((value) =>
    String(value || "").toLowerCase().includes(query)
  );
});

  const page = Number(pagination.page) || 1;
  const totalPages = Math.max(Number(pagination.totalPages) || 1, 1);
  const totalRecords = Number(pagination.total) || 0;

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <ReceiptText size={16} />
            Sales &amp; Invoices
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Sales history
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track sales, monitor outstanding customer balances, retrieve
            invoices, and print customer receipts.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing || loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales on this page"
          value={sales.length.toLocaleString("en-PK")}
          detail={`${totalRecords.toLocaleString("en-PK")} matching records`}
          icon={ReceiptText}
        />

        <StatCard
          label="Value on this page"
          value={money(totalValue)}
          detail="Sum of payments recorded on this page"
          icon={Banknote}
        />

        <StatCard
          label="Cash transactions"
          value={cashSales.toLocaleString("en-PK")}
          detail="Cash sales on this page"
          icon={CheckCircle2}
        />

        <StatCard
          label="Remaining payments"
          value={money(remainingTotal)}
          detail={`${remainingSales.length} sale${
            remainingSales.length === 1 ? "" : "s"
          } with outstanding balances`}
          icon={AlertCircle}
          onClick={() => {
  setRemainingSearch("");
  setShowRemainingPayments(true);
}}
        />
      </div>

      {/* Search and filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 lg:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search invoice, customer, phone or site name..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Search size={16} />
            Search
          </button>
        </form>

        <form
          onSubmit={applyDates}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              From date
            </span>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              To date
            </span>

            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </label>

          <button
            type="submit"
            className="self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Apply dates
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="self-end rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Clear filters
          </button>
        </form>
      </div>

      {/* Sales table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Sales history</h2>
            <p className="mt-1 text-xs text-slate-500">
              Customer details, payment balances, and invoice actions.
            </p>
          </div>

          <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
            {totalRecords.toLocaleString("en-PK")} records
          </span>
        </div>

        {error && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Could not load sales</p>
              <p className="mt-1 break-words">{error}</p>

              <button
                type="button"
                onClick={() => loadSales(1)}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="w-full">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className="w-[19%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
            </colgroup>

            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-3 font-semibold">Invoice</th>
                <th className="px-2 py-3 font-semibold">Date &amp; time</th>
                <th className="px-2 py-3 font-semibold">Customer / Site</th>
                <th className="px-2 py-3 font-semibold">Payment</th>
                <th className="px-2 py-3 text-right font-semibold">Total</th>
                <th className="px-2 py-3 text-right font-semibold">Paid</th>
                <th className="px-2 py-3 text-right font-semibold">Remaining</th>
                <th className="px-1 py-3 text-center font-semibold">Status</th>
                <th className="px-1 py-3 text-center font-semibold">Invoice</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Package size={25} />
                    </div>
                    <p className="mt-4 font-semibold text-slate-800">
                      No sales found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or complete a sale through the POS.
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const PaymentIcon = paymentIcon(sale.paymentMethod);
                  const remaining = getRemaining(sale);
                  const paid = getPaidAmount(sale);
                  const status = getPaymentStatus(sale);

                  return (
                    <tr key={sale._id} className="transition hover:bg-slate-50">
                      <td className="break-words px-2 py-3">
                        <div className="font-bold text-slate-900">
                          {sale.invoiceNumber || "—"}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          {sale.items?.length || 0} items
                        </div>
                      </td>

                      <td className="px-2 py-3 text-[11px] leading-5 text-slate-600">
                        {formatDate(sale.createdAt)}
                      </td>

                      <td className="px-2 py-3">
                        <div
                          className="truncate font-semibold text-slate-800"
                          title={sale.customerName || "Walk-in Customer"}
                        >
                          {sale.customerName || "Walk-in Customer"}
                        </div>
                        {sale.customerPhone && (
                          <div className="mt-1 truncate text-[10px] text-slate-400">
                            {sale.customerPhone}
                          </div>
                        )}
                        {sale.siteName && (
                          <div
                            className="mt-1 truncate text-[10px] font-medium text-indigo-600"
                            title={sale.siteName}
                          >
                            {sale.siteName}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-3">
                        <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-100 px-1.5 py-1 text-[10px] font-semibold text-slate-600">
                          <PaymentIcon size={12} className="shrink-0" />
                          <span className="truncate">
                            {paymentLabel(sale.paymentMethod)}
                          </span>
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                        {money(sale.total)}
                      </td>

                      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-slate-700">
                        {money(paid)}
                      </td>

                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <span
                          className={`font-bold tabular-nums ${
                            remaining > 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {money(remaining)}
                        </span>
                      </td>

                      <td className="px-1 py-3 text-center">
                        <span
                          title={status}
                          className={`inline-block max-w-full truncate rounded-full px-1.5 py-1 text-[9px] font-semibold ring-1 ring-inset ${statusClasses(status)}`}
                        >
                          {status === "Partially Paid" ? "Partial" : status}
                        </span>
                      </td>

                      <td className="px-1 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openSale(sale)}
                          title="View invoice"
                          aria-label={`View invoice ${sale.invoiceNumber || ""}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
            {" · "}
            {totalRecords.toLocaleString("en-PK")} matching records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadSales(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => loadSales(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding payments modal */}
      {showRemainingPayments && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowRemainingPayments(false);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                  <AlertCircle size={16} />
                  Outstanding balances
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Remaining payments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Customers who still owe money for their sales.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRemainingPayments(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close remaining payments"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Outstanding sales
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {remainingSales.length}
                </p>
              </div>

              <div className="rounded-xl border border-red-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                  Total outstanding on this page
                </p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {money(
                    remainingSales.reduce(
                      (sum, sale) => sum + getRemaining(sale),
                      0
                    )
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-4 sm:px-7">
  <div className="relative">
    <Search
      size={18}
      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
    />

    <input
      type="search"
      value={remainingSearch}
      onChange={(event) => setRemainingSearch(event.target.value)}
      placeholder="Search customer, phone, invoice or site..."
      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
    />
  </div>

  {remainingSearch.trim() && (
    <p className="mt-2 text-xs text-slate-500">
      {filteredRemainingSales.length} matching outstanding invoice(s)
    </p>
  )}
</div>
              {filteredRemainingSales.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={27} />
                  </div>

                  <h3 className="mt-4 font-bold text-slate-900">
  {remainingSearch.trim()
    ? "No matching customers"
    : "No outstanding payments"}
</h3>

                  <p className="mt-1 text-sm text-slate-500">
  {remainingSearch.trim()
    ? "Try another customer name, phone number, invoice number or site."
    : "No sales on this page have a remaining balance."}
</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRemainingSales.map((sale) => {
                    const remaining = getRemaining(sale);
                    const paid = getPaidAmount(sale);

                    return (
                      <div
                        key={sale._id}
                        className="p-5 transition hover:bg-slate-50 sm:px-7"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {sale.customerName || "Walk-in Customer"}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(
                                  getPaymentStatus(sale)
                                )}`}
                              >
                                {getPaymentStatus(sale)}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
                              <span className="inline-flex items-center gap-1.5">
                                <FileText size={14} />
                                {sale.invoiceNumber || "No invoice number"}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays size={14} />
                                {formatDate(sale.createdAt)}
                              </span>

                              {sale.customerPhone && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Phone size={14} />
                                  {sale.customerPhone}
                                </span>
                              )}

                              {sale.siteName && (
                                <span className="inline-flex items-center gap-1.5 text-indigo-600">
                                  <MapPin size={14} />
                                  {sale.siteName}
                                </span>
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">
                                  Total bill
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                  {money(sale.total)}
                                </p>
                              </div>

                              <div className="rounded-xl bg-emerald-50 p-3">
                                <p className="text-xs text-emerald-700">
                                  Amount paid
                                </p>
                                <p className="mt-1 font-bold text-emerald-700">
                                  {money(paid)}
                                </p>
                              </div>

                              <div className="rounded-xl bg-red-50 p-3">
                                <p className="text-xs text-red-600">
                                  Remaining balance
                                </p>
                                <p className="mt-1 font-bold text-red-600">
                                  {money(remaining)}
                                </p>
                              </div>
                            </div>
                          </div>

                        
<div className="flex shrink-0 flex-wrap gap-2">
  <button
    type="button"
    onClick={() => {
      setShowRemainingPayments(false);
      openSale(sale);
    }}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
  >
    <Eye size={16} />
    View sale
  </button>

  <button
    type="button"
    onClick={() => markSaleAsPaid(sale)}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
  >
    <CheckCircle2 size={16} />
    Mark as Paid
  </button>
</div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>

              <button
                type="button"
                onClick={() => setShowRemainingPayments(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice details modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSale(null);
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <FileText size={15} />
                  Invoice details
                </div>

                <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
                  {selectedSale.invoiceNumber || "Sale invoice"}
                </h2>

                {selectedSale.siteName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600">
                    <MapPin size={12} />
                    <span className="truncate">{selectedSale.siteName}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close invoice"
              >
                <X size={21} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {detailLoading && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  <RefreshCw size={15} className="animate-spin" />
                  Loading saved invoice details...
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Invoice date
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDate(selectedSale.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Customer
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                    {selectedSale.customerName || "Walk-in Customer"}
                  </p>
                  {selectedSale.customerPhone && (
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedSale.customerPhone}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Site / Project
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                    {selectedSale.siteName || "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Payment status
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(getPaymentStatus(selectedSale))}`}
                    >
                      {getPaymentStatus(selectedSale)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {paymentLabel(selectedSale.paymentMethod)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(selectedSale.items || []).map((item, index) => (
                      <tr key={item._id || `${item.product}-${index}`}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-800">
                            {item.name || "Product"}
                          </p>
                          {item.sku && (
                            <p className="mt-1 text-xs text-slate-400">
                              SKU: {item.sku}
                            </p>
                          )}
                          {item.unit && (
                            <p className="mt-1 text-xs text-slate-400">
                              Unit: {item.unit}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-600">
                          {numeric(item.quantity)}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-600">
                          {money(item.unitPrice)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-slate-900">
                          {money(
                            item.lineTotal ??
                              numeric(item.quantity) * numeric(item.unitPrice)
                          )}
                        </td>
                      </tr>
                    ))}

                    {(selectedSale.items || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No item details are available for this sale.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm rounded-2xl bg-slate-50 p-5">
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold text-slate-800">
                      {money(selectedSale.subtotal)}
                    </span>
                  </div>

              {/* Payment history */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Payment history
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Individual payments recorded against this invoice.
                      </p>
                    </div>

                    {getRemaining(selectedSale) > 0 && (
                      <button
                        type="button"
                        onClick={() => recordPayment(selectedSale)}
                        disabled={detailLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Banknote size={16} />
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>

                {!selectedSale.payments?.length ? (
                  <div className="px-5 py-6 text-sm text-slate-500">
                    No individual payment records are available for this
                    invoice yet. Payments received before payment tracking
                    was introduced may not have individual records.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedSale.payments.map((payment) => {
                      const PaymentIcon = paymentIcon(payment.method);

                      return (
                        <div
                          key={payment._id}
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                              <PaymentIcon size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-900">
                                {money(payment.amount)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(payment.createdAt)} ·{" "}
                                {paymentLabel(payment.method)}
                              </p>

                              {payment.receivedBy?.name && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Received by {payment.receivedBy.name}
                                </p>
                              )}

                              {payment.notes && (
                                <p className="mt-1 break-words text-sm text-slate-600">
                                  {payment.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="inline-flex self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Received
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>


                  {numeric(selectedSale.discount) > 0 && (
                    <div className="flex justify-between gap-4 py-2 text-sm">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-semibold text-slate-800">
                        − {money(selectedSale.discount)}
                      </span>
                    </div>
                  )}

                  {numeric(selectedSale.taxAmount) > 0 && (
                    <div className="flex justify-between gap-4 py-2 text-sm">
                      <span className="text-slate-500">
                        Tax
                        {numeric(selectedSale.taxRate) > 0
                          ? ` (${numeric(selectedSale.taxRate)}%)`
                          : ""}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {money(selectedSale.taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex justify-between gap-4 border-t border-slate-200 pt-4">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {money(selectedSale.total)}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Amount paid</span>
                    <span className="font-semibold text-emerald-700">
                      {money(getPaidAmount(selectedSale))}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Remaining balance</span>
                    <span
                      className={`font-bold ${getRemaining(selectedSale) > 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {money(getRemaining(selectedSale))}
                    </span>
                  </div>

                  {numeric(selectedSale.changeDue) > 0 && (
                    <div className="mt-2 flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Change returned</span>
                      <span className="font-semibold text-slate-800">
                        {money(selectedSale.changeDue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
                This invoice is based on the saved sale record. Printing it
                again will not create a new sale or change inventory.
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
             
              {getRemaining(selectedSale) > 0 && (
                <button
                  type="button"
                  onClick={() => recordPayment(selectedSale)}
                  disabled={detailLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Banknote size={17} />
                  Record Payment
                </button>
              )}

              <button

                type="button"
                onClick={() => printSale(selectedSale, shop, "thermal")}
                disabled={detailLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ReceiptText size={17} />
                Print thermal receipt
              </button>

              <button
                type="button"
                onClick={() => printSale(selectedSale, shop, "a4")}
                disabled={detailLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Printer size={17} />
                Print A4 invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
