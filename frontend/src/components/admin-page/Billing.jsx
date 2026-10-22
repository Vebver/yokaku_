import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import "../../Style/Billing.css";
import {
  Loader2,
  ReceiptText,
  CheckCircle2,
  Calendar,
  Layers,
  XCircle,
  CornerDownRight,
  Eye,
  Printer,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";
import { useSectionRefresh } from "../shared/sectionRefresh";
import AdminPagination from "../shared/AdminPagination";
import { compareByPaymentRecency } from "../shared/sortUtils";
import { handlePrintReceipt } from "./receiptPrinter";
import EventTakeoutModal from "./EventTakeoutModal";

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const closeBtnRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Filter controls.
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [settlementFilter, setSettlementFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [takeoutReservationId, setTakeoutReservationId] = useState(null);
  const [takeoutSummary, setTakeoutSummary] = useState(null);
  const [takeoutSummaryError, setTakeoutSummaryError] = useState("");

  const compareByReservationCreation = (a, b) => {
    const aCreated = new Date(a?.created_at || 0).getTime();
    const bCreated = new Date(b?.created_at || 0).getTime();
    const aValid = Number.isFinite(aCreated);
    const bValid = Number.isFinite(bCreated);

    if (aValid !== bValid) return aValid ? -1 : 1;
    if (aValid && aCreated !== bCreated) return bCreated - aCreated;
    return compareByPaymentRecency(a, b);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchPayments();
  });

  useEffect(() => {
    return () => {
      const backdrops = document.querySelectorAll(".offcanvas-backdrop");
      backdrops.forEach((el) => el.remove());
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [payments]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing`);
      // Newest reservation first, with payment time as a tie-breaker.
      setPayments(res.data.slice().sort(compareByReservationCreation));
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("new_reservation", fetchPayments);
    socket.on("payment_updated", fetchPayments);
    socket.on("payment_status_updated", fetchPayments);
    return () => {
      socket.off("new_reservation", fetchPayments);
      socket.off("payment_updated", fetchPayments);
      socket.off("payment_status_updated", fetchPayments);
      socket.disconnect();
    };
  }, []);

  const resetPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setPaymentStatusFilter("all");
    setSettlementFilter("all");
    setOrderStatusFilter("all");
    resetPage();
  };

  const hasActiveFilters =
    paymentStatusFilter !== "all" ||
    settlementFilter !== "all" ||
    orderStatusFilter !== "all";

  // Newest reservation first by creation timestamp.
  const filteredPayments = payments
    .filter((p) => {
      const fullName =
        `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      const resId = (p.reservation_id || "").toLowerCase();
      const term = searchQuery.toLowerCase();
      return fullName.includes(term) || resId.includes(term);
    })
    .filter((p) => {
      if (paymentStatusFilter !== "all") {
        if ((p.payment_status || "").toLowerCase() !== paymentStatusFilter) {
          return false;
        }
      }
      if (settlementFilter !== "all") {
        if ((p.settlement_status || "").toLowerCase() !== settlementFilter) {
          return false;
        }
      }
      if (orderStatusFilter !== "all") {
        if ((p.order_status || "").toLowerCase() !== orderStatusFilter) {
          return false;
        }
      }
      return true;
    })
    .sort(compareByReservationCreation);

  const getItemPrice = (item) => {
    const isRefill =
      item.is_refill === 1 ||
      item.is_refill === true ||
      (item.customizations &&
        item.customizations.toString().includes("[REFILL]"));
    return isRefill ? 0 : Number(item.price || 0);
  };

  const calculateItemsSum = () => {
    return orderLineItems.reduce(
      (sum, item) => sum + item.quantity * getItemPrice(item),
      0,
    );
  };

  const getRemainingBalanceInfo = () => {
    const paymentTotal = Number(selectedPayment?.total_bill);
    const total =
      Number.isFinite(paymentTotal) && paymentTotal > 0
        ? paymentTotal
        : calculateItemsSum();
    const paid = Number(selectedPayment?.amount || 0);
    const remaining = Math.max(total - paid, 0);
    return {
      remaining,
      overpaid: paid > total ? paid - total : 0,
    };
  };

  // The paid amount / down payment is payment information only. It must never
  // be rendered as a line inside the Order Items list. The API tags the
  // injected "Reservation Fee" row as line_type "downpayment"; the name checks
  // are a safety net for older records.
  const isPaymentRow = (item) => {
    const lineType = String(item?.line_type ?? "").toLowerCase();
    if (lineType === "downpayment" || lineType === "payment") return true;

    const name = String(item?.name || item?.item_name || "")
      .trim()
      .toLowerCase();
    return (
      item?.is_payment === true ||
      item?.is_payment === 1 ||
      item?.is_payment === "1" ||
      /^(amount\s)?(paid|down\s?payment|partial\s?payment|deposit)\b/.test(name)
    );
  };

  const orderLineItems = orderItems.filter((item) => !isPaymentRow(item));

  // Kiosk-order spend only. The injected "Reservation Fee" (downpayment) row is
  // a payment record, not an order line, so it must never inflate the spend
  // progress toward the event package limit.
  const calculateKioskSpend = () => {
    return orderLineItems.reduce(
      (sum, item) => sum + item.quantity * getItemPrice(item),
      0,
    );
  };

  // calculateItemsSum() and calculateKioskSpend() read orderLineItems, so both
  // are declared after the filter above.

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = filteredPayments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const handleReviewClick = async (p) => {
    setSelectedPayment(p);
    setTakeoutSummary(null);
    setTakeoutSummaryError("");
    setOrderItems([]);
    setLoadingItems(true);
    setShowRejectForm(false);
    setRejectReason("The receipt image is unclear or details do not match.");

    try {
      const [itemsRes, reservationRes] = await Promise.all([
        api.get(`/reservations/${p.reservation_id}/items`),
        api
          .get(`/reservations/details/${p.reservation_id}`)
          .catch((detailsError) => {
            console.error("Reservation details loading error:", detailsError);
            return null;
          }),
      ]);

      setOrderItems(itemsRes.data);

      let paymentDetails = p;
      if (reservationRes && reservationRes.data) {
        const details = reservationRes.data.data || reservationRes.data.reservation || reservationRes.data;

        paymentDetails = {
          ...details,
          ...paymentDetails,
        };
        setSelectedPayment(paymentDetails);
      }

      const packageName = String(
        paymentDetails.package_name || paymentDetails.packageName || "",
      ).toLowerCase();
      const isEventReservation =
        String(
          paymentDetails.reservation_type ||
            paymentDetails.reservationType ||
            "",
        ).toLowerCase() === "event" &&
        (packageName.includes("standard") ||
          packageName.includes("premium"));

      const isSeated =
        String(
          paymentDetails.order_status ||
            paymentDetails.status ||
            paymentDetails.reservation_status ||
            "",
        ).toLowerCase() === "seated";

      if (isEventReservation && isSeated) {
        try {
          const takeoutRes = await api.get(
            `/reservations/${p.reservation_id}/event-takeout`,
          );
          setTakeoutSummary(takeoutRes.data);
        } catch (takeoutError) {
          console.error("Takeout summary loading error:", takeoutError);
          setTakeoutSummaryError(
            "Takeout values could not be loaded; spend progress may be incomplete.",
          );
          showToast("Could not load takeout values for spend progress.", "warning");
        }
      }
    } catch (err) {
      console.error("Review loading error:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const submitRejection = async () => {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please log in again.");

    const finalReason =
      rejectReason.trim() ||
      "Invalid proof of payment. Please re-upload within 12 hours.";

    try {
      await api.put(`/billing/reject/${selectedPayment.reservation_id}`, {
        reason: finalReason,
      });

      setSelectedPayment((prev) => ({
        ...prev,
        payment_status: "rejected",
        rejection_reason: finalReason,
      }));

      await fetchPayments();
      setShowRejectForm(false);
    } catch (err) {
      console.error("Rejection error:", err);
      showToast("Failed to reject payment.");
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mb-2" size={40} />
          <div className="text-muted small fw-semibold">
            Loading transactions...
          </div>
        </div>
      </div>
    );

  const balanceInfo = getRemainingBalanceInfo();

  // Helper flag to detect walk-in reservations
  const isWalkIn =
    selectedPayment?.first_name?.toLowerCase().includes("walk") ||
    selectedPayment?.reservation_id?.toUpperCase().startsWith("WALK");

  return (
    <div
      className="container-fluid py-4 bg-light"
      style={{ minHeight: "100vh" }}
    >
      {/* HEADER SECTION */}
      <div className="admin-page-header row align-items-center mb-3 px-2">
        <div className="col-12">
          <h2 className="fw-bold mb-1 text-dark">Billing & Transactions</h2>
          <p className="text-muted small mb-0">
            Monitor incoming payments, verify customer receipts, and manage
            order settlements.
          </p>
        </div>
      </div>

      {/* SEARCH BAR + FILTERS (same row on wide screens) */}
      <div className="admin-toolbar row g-2 align-items-center mb-3 px-2">
        <div className="col-12 col-xl-5">
          <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3">
            <Search size={20} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              style={{
                color: "#212529",
                fontSize: "16px",
                fontWeight: "500",
                height: "100%",
              }}
              placeholder="Search by guest name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="d-flex flex-wrap gap-2 align-items-center admin-filter-bar">
            <select
              className="form-select form-select-sm admin-filter-select"
              aria-label="Filter by payment status"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Any payment status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="form-select form-select-sm admin-filter-select"
              aria-label="Filter by balance"
              value={settlementFilter}
              onChange={(e) => {
                setSettlementFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Any balance</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid in full</option>
            </select>

            <select
              className="form-select form-select-sm admin-filter-select"
              aria-label="Filter by order status"
              value={orderStatusFilter}
              onChange={(e) => {
                setOrderStatusFilter(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Any order status</option>
              <option value="seated">Seated</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {hasActiveFilters && (
              // Same "Clear Filter" pattern as Online Bookings / Walk-ins.
              <button
                className="btn btn-sm btn-link text-decoration-none px-0 admin-clear-filter"
                onClick={clearFilters}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE CARD (DESKTOP ONLY) */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2 d-none d-md-block">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "1100px" }}
          >
            <thead className="bg-light-subtle border-bottom">
              <tr
                className="text-muted small text-uppercase"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                <th className="ps-4">Customer Profile</th>
                <th>Method</th>
                <th>Paid</th>
                <th>Total Bill</th>
                <th>Balance Due</th>
                <th>Payment Proof</th>
                <th>Settlement Status</th>
                <th className="text-center">Order status</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPayments.length > 0 ? (
                currentPayments.map((p) => {
                  const payStatus = (
                    p.payment_status || "PENDING"
                  ).toLowerCase();
                  const isCompleted =
                    (p.order_status || p.status || "").toLowerCase() ===
                    "completed";

                  return (
                    <tr key={p.payment_id} className="transition-all align-top">
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div>
                            <div className="fw-bold text-dark mb-0">
                              {p.first_name === "Walk-in" ||
                              p.first_name === "Walk-In"
                                ? `Walk-In (Table ${p.table_number || "?"})`
                                : `${p.first_name || "Guest"} ${p.last_name || ""}`}
                            </div>
                            <small
                              className="text-muted font-monospace"
                              style={{ fontSize: "0.75rem" }}
                            >
                              ID: {p.reservation_id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge bg-light text-dark border px-2 py-1 font-monospace"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {p.payment_method
                            ? p.payment_method.toUpperCase()
                            : "PENDING"}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">
                          ₱
                          {p.amount
                            ? Number(p.amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })
                            : "0.00"}
                        </div>
                      </td>
                      <td>
                        ₱
                        {Number(p.total_bill || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <span
                          className={
                            Number(p.balance_due || 0) > 0
                              ? "text-danger fw-bold"
                              : "text-success fw-bold"
                          }
                        >
                          ₱
                          {Number(p.balance_due || 0).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge rounded-pill px-3 py-1.5 fw-semibold ${
                            payStatus === "verified"
                              ? "bg-success-subtle text-success"
                              : payStatus === "rejected"
                                ? "bg-danger-subtle text-danger"
                                : "bg-warning-subtle text-warning-emphasis"
                          }`}
                        >
                          {payStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {p.settlement_status === "paid" ? (
                          <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fw-semibold">
                            FULLY PAID
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border px-3 py-1.5 fw-semibold">
                            {p.settlement_status === "unpaid"
                              ? "UNPAID"
                              : "PARTIAL BILL"}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge rounded-pill px-3 py-1.5 fw-semibold ${isCompleted ? "bg-success text-white" : "bg-secondary text-white"}`}
                        >
                          {(
                            p.order_status ||
                            p.status ||
                            "PENDING"
                          ).toUpperCase()}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-3 py-1.5"
                          data-bs-toggle="offcanvas"
                          data-bs-target="#billingDrawer"
                          onClick={() => handleReviewClick(p)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <div className="py-3">
                      <p className="mb-0 fw-semibold">
                        No transactions available
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION — shared component (matches Inventory / Categories) */}
      </div>

      {/* MOBILE CARD LIST */}
      <div className="d-md-none px-2">
        {currentPayments.length > 0 ? (
          currentPayments.map((p) => {
            const payStatus = (p.payment_status || "PENDING").toLowerCase();
            const isCompleted =
              (p.order_status || p.status || "").toLowerCase() === "completed";
            const customerName =
              p.first_name === "Walk-in" || p.first_name === "Walk-In"
                ? `Walk-In (Table ${p.table_number || "?"})`
                : `${p.first_name || "Guest"} ${p.last_name || ""}`;

            return (
              <div
                key={p.payment_id}
                className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden"
              >
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold text-dark lh-sm">
                        {customerName}
                      </div>
                      <code
                        className="text-muted font-monospace"
                        style={{ fontSize: "0.6rem" }}
                      >
                        ID: {p.reservation_id}
                      </code>
                    </div>
                    <span
                      className={`badge rounded-pill px-3 py-1.5 fw-semibold flex-shrink-0 ${
                        payStatus === "verified"
                          ? "bg-success-subtle text-success"
                          : payStatus === "rejected"
                            ? "bg-danger-subtle text-danger"
                            : "bg-warning-subtle text-warning-emphasis"
                      }`}
                    >
                      {payStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 small text-muted mb-2">
                    <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                      {p.payment_method
                        ? p.payment_method.toUpperCase()
                        : "PENDING"}
                    </span>
                    <span className="d-flex align-items-center gap-1">
                      <strong>
                        Paid: ₱
                        {p.amount
                          ? Number(p.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "0.00"}
                      </strong>
                    </span>
                    <span
                      className={
                        Number(p.balance_due || 0) > 0
                          ? "text-danger fw-bold"
                          : "text-success fw-bold"
                      }
                    >
                      Balance: ₱
                      {Number(p.balance_due || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {p.settlement_status === "paid" ? (
                      <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1.5 fw-semibold">
                        FULLY PAID
                      </span>
                    ) : (
                      <span className="badge bg-light text-muted border px-3 py-1.5 fw-semibold">
                        {p.settlement_status === "unpaid"
                          ? "UNPAID"
                          : "PARTIAL BILL"}
                      </span>
                    )}
                    <span
                      className={`badge rounded-pill px-3 py-1.5 fw-semibold ${isCompleted ? "bg-success text-white" : "bg-secondary text-white"}`}
                    >
                      {(p.order_status || p.status || "PENDING").toUpperCase()}
                    </span>
                  </div>

                  <button
                    className="btn btn-sm btn-dark px-3 fw-bold shadow-sm rounded-3 py-1.5 w-100"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#billingDrawer"
                    onClick={() => handleReviewClick(p)}
                  >
                    Review
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-5 text-muted">
            <p className="mb-0 fw-semibold">No transactions available</p>
          </div>
        )}
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredPayments.length}
        itemsPerPage={itemsPerPage}
        label="transactions"
        onPageChange={setCurrentPage}
      />

      {/* OFFCANVAS DRAWER */}
      <div
        className="offcanvas offcanvas-end border-0 shadow-lg"
        tabIndex="-1"
        id="billingDrawer"
        data-bs-backdrop="true"
        data-bs-scroll="true"
        style={{ width: "min(100%, 520px)" }}
      >
        <div className="offcanvas-header border-bottom bg-white py-3 px-3">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <span
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-primary bg-opacity-10"
              style={{ width: "36px", height: "36px" }}
            >
              <ReceiptText size={18} className="text-primary" />
            </span>
            <div className="min-w-0">
              <h5 className="fw-bold mb-0 text-dark text-truncate">
                Financial Review
              </h5>
              <small className="text-muted d-block text-truncate">
                ID: {selectedPayment?.reservation_id || "---"}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close shadow-none flex-shrink-0"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column bg-light-subtle">
          {selectedPayment && (
            <>
              {/* 1. ORDER SUMMARY SECTION (Scrollable Light Area)
                 min-height:0 is required so this flex child can actually
                 shrink and scroll; without it the flex container refuses to
                 shrink below content height, which pushed the action buttons
                 in the dark footer below it off-screen/compressed. */}
              <div className="px-3 pt-3 pb-0 flex-grow-1 overflow-auto drawer-scroll-area">
                {/* GUEST CONTEXT HEADER */}
                <div className="bg-white border rounded-3 shadow-sm p-2 px-3 mb-3 d-flex justify-content-between align-items-center gap-2">
                  <div className="text-start">
                    <div
                      className="fw-bold text-dark"
                      style={{ fontSize: "0.95rem" }}
                    >
                      {[selectedPayment?.first_name, selectedPayment?.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "Walk-in Guest"}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      {selectedPayment?.num_guests
                        ? `${selectedPayment.num_guests} pax`
                        : "Walk-in"}
                      {selectedPayment?.table_number
                        ? ` • Table ${selectedPayment.table_number}`
                        : ""}
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className={`badge ${
                        selectedPayment?.order_status?.toLowerCase() ===
                        "completed"
                          ? "text-bg-success"
                          : "text-bg-warning"
                      }`}
                    >
                      {selectedPayment?.order_status || "Pending"}
                    </span>
                    {balanceInfo.overpaid > 0 && (
                      <div
                        className="text-success fw-bold mt-1"
                        style={{ fontSize: "0.68rem" }}
                      >
                        Overpaid ₱
                        {balanceInfo.overpaid.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ALLERGY WARNING — must be impossible to miss for the kitchen */}
                {(() => {
                  const note = (selectedPayment?.allergy_note || "").trim();
                  if (!note || note.toLowerCase() === "none") return null;
                  return (
                    <div
                      className="alert alert-danger border-0 rounded-3 p-2 px-3 mb-3 d-flex align-items-start gap-2 shadow-sm"
                      role="alert"
                    >
                      <AlertTriangle size={20} className="flex-shrink-0 mt-1" />
                      <div>
                        <div
                          className="fw-bold text-uppercase"
                          style={{
                            fontSize: "0.68rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Allergy Alert
                        </div>
                        <div className="fw-bold" style={{ fontSize: "0.9rem" }}>
                          {note}
                        </div>
                        <div
                          className="text-danger-emphasis"
                          style={{ fontSize: "0.7rem" }}
                        >
                          Inform the kitchen before preparing.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <span
                    className="fw-bold text-muted text-uppercase tracking-wider"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Order Items
                  </span>
                  <span
                    className="badge bg-secondary-subtle text-secondary font-monospace"
                    style={{ fontSize: "0.7rem" }}
                  >
                    ID: {selectedPayment.reservation_id}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    onClick={() =>
                      handlePrintReceipt({
                        selectedPayment,
                        orderLineItems,
                        getItemPrice,
                        calculateItemsSum,
                        showToast,
                      })
                    }
                    disabled={loadingItems}
                  >
                    <Printer size={14} />
                    Print Receipt
                  </button>
                </div>

                {/* ==================== INTEGRATED DYNAMIC EVENT SPEND TRACKER ==================== */}
                {(() => {
                  // Include kiosk orders and takeout values, but not downpayment.
                  const kioskSpend = calculateKioskSpend();
                  const takeoutSpend = Number(takeoutSummary?.takeout_value) || 0;
                  const totalBill = kioskSpend + takeoutSpend;

                  const rawPackageName =
                    selectedPayment?.package_name ||
                    selectedPayment?.packageName ||
                    "";

                  const eventItem = orderLineItems.find((item) => {
                    const name = (
                      item.name ||
                      item.item_name ||
                      ""
                    ).toLowerCase();
                    return (
                      name.includes("standard package") ||
                      name.includes("premium package") ||
                      name.includes("event")
                    );
                  });

                  const matchedPackageName = eventItem
                    ? eventItem.name || eventItem.item_name
                    : rawPackageName;
                  const pkgName = matchedPackageName.toLowerCase().trim();

                  const isEvent =
                    selectedPayment?.reservation_type?.toLowerCase() ===
                      "event" ||
                    selectedPayment?.reservationType?.toLowerCase() ===
                      "event" ||
                    pkgName.includes("event") ||
                    pkgName.includes("standard") ||
                    pkgName.includes("premium");

                  const isSeated =
                    String(
                      selectedPayment?.order_status ||
                        selectedPayment?.status ||
                        selectedPayment?.reservation_status ||
                        "",
                    ).toLowerCase() === "seated";

                  if (!isEvent || !isSeated) return null;

                  const eventLimits = {
                    "standard package": 10000,
                    "premium package": 12500,
                    event_a: 10000,
                    event_b: 12500,
                  };

                  const targetLimit = eventLimits[pkgName] || 10000;
                  const percentage = Math.min(
                    100,
                    (totalBill / targetLimit) * 100,
                  );
                  const warningThreshold = targetLimit * 0.85;
                  const isNearing =
                    totalBill >= warningThreshold && totalBill < targetLimit;
                  const isMet = totalBill >= targetLimit;

                  return (
                    <div className="card border bg-white p-2 mb-2 rounded-3 shadow-sm text-dark animate-fade-in">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span
                          className="small fw-bold text-muted text-uppercase tracking-wider"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {matchedPackageName} Spend Progress
                        </span>
                        <span
                          className="small fw-bold text-primary"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {percentage.toFixed(0)}%
                        </span>
                      </div>

                      <div
                        className="progress mb-2 bg-light border-0"
                        style={{
                          height: "8px",
                          borderRadius: "50px",
                          backgroundColor: "#e9ecef",
                        }}
                      >
                        <div
                          className={`progress-bar ${isMet ? "bg-success" : isNearing ? "bg-warning" : "bg-primary"}`}
                          role="progressbar"
                          style={{
                            width: `${percentage}%`,
                            borderRadius: "50px",
                            transition: "width 0.4s ease",
                          }}
                        ></div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span
                          className="text-muted"
                          style={{ fontSize: "0.72rem" }}
                        >
                          Spend so far: ₱
                          {totalBill.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span
                          className="text-muted"
                          style={{ fontSize: "0.72rem" }}
                        >
                          Target Limit: ₱
                          {targetLimit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        {isMet ? (
                          <span
                            className="badge bg-success-subtle text-success border border-success-subtle rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            ✓ Limit Met
                          </span>
                        ) : isNearing ? (
                          <span
                            className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            ⚠️ Near Limit
                          </span>
                        ) : (
                          <span
                            className="badge bg-light text-muted border rounded-pill"
                            style={{ fontSize: "0.65rem", padding: "3px 8px" }}
                          >
                            Tracking
                          </span>
                        )}
                      </div>
                      {takeoutSummaryError && (
                        <p className="text-danger small mb-0 mt-2">
                          {takeoutSummaryError}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {loadingItems ? (
                  <div className="text-center py-5">
                    <Loader2 className="animate-spin text-primary" />
                    <div className="text-muted small mt-2">
                      Loading itemized summary...
                    </div>
                  </div>
                ) : (
                  <div className="item-list">
                    {orderLineItems.map((item, idx) => {
                      const isRefill =
                        item.is_refill === 1 ||
                        item.is_refill === true ||
                        (item.customizations &&
                          item.customizations.toString().includes("[REFILL]"));
                      const currentPrice = isRefill
                        ? 0
                        : Number(item.price || 0);

                    return (
                      <div
                        key={idx}
                        className="mb-2 p-2 bg-white rounded-3 border shadow-sm d-flex align-items-center gap-2"
                      >
                        <span
                          className="badge bg-dark rounded-1 flex-shrink-0"
                          style={{
                            fontSize: "0.7rem",
                            width: "30px",
                            padding: "6px 0",
                          }}
                        >
                          x{item.quantity}
                        </span>
                        <div className="flex-grow-1 text-start overflow-hidden">
                          <div
                            className="fw-bold text-dark small text-truncate"
                          >
                            {item.name || item.item_name}
                            {isRefill && (
                              <span
                                className="badge bg-success-subtle text-success ms-2 text-uppercase"
                                style={{ fontSize: "0.6rem" }}
                              >
                                Refill
                              </span>
                            )}
                          </div>
                          {item.customizations && (
                            <div
                              className="text-muted"
                              style={{
                                fontSize: "0.7rem",
                                lineHeight: 1.35,
                              }}
                            >
                              {item.customizations}
                            </div>
                          )}
                          <small className="text-muted">
                            ₱{currentPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })} each
                          </small>
                        </div>
                        <span
                          className="fw-bold text-dark small text-end flex-shrink-0"
                        >
                          ₱
                          {(item.quantity * currentPrice).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(() => {
                const packageName = String(
                  selectedPayment?.package_name || "",
                ).toLowerCase();
                const supportsTakeout =
                  packageName.includes("standard") ||
                  packageName.includes("premium");
                const isSeated =
                  String(selectedPayment?.order_status || selectedPayment?.status || "").toLowerCase() === "seated";

                return supportsTakeout && isSeated ? (
                  <button
                    type="button"
                    className="btn btn-outline-warning fw-bold w-100 mb-3"
                    onClick={() =>
                      setTakeoutReservationId(selectedPayment.reservation_id)
                    }
                  >
                    View Package Balance / Request Meals
                  </button>
                ) : null;
              })()}

            </div>

              {/* 2. RECEIPT & METADATA SECTION (Dark Background Area)
                 flex-shrink:0 pins this block at its natural height instead of
                 letting it collapse when the order list above grows long. */}
              <div className="p-3 bg-dark text-white rounded-top-4 shadow-lg mt-0 flex-shrink-0 drawer-footer">
                <div className="card bg-secondary bg-opacity-25 border-secondary border-opacity-25 p-2 mb-1.5">
                  <div className="d-flex justify-content-between mb-1 text-white-50 small">
                    <span>Total Bill</span>
                    <span className="text-white">
                      ₱
                      {Number(
                        selectedPayment?.total_bill || calculateItemsSum(),
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Show the same paid and outstanding balance breakdown for walk-ins and reservations. */}
                  {
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-1.5 pb-1.5 border-bottom border-secondary border-opacity-50">
                        <span className="text-white-50 small">Paid Amount</span>
                        <span className="fw-semibold text-success">
                          ₱
                          {Number(selectedPayment?.amount || 0).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-semibold text-white-50">
                          Remaining Balance
                        </span>
                        <span
                          className={
                            balanceInfo.remaining > 0
                              ? "fw-bold text-warning fs-5"
                              : "badge bg-success-subtle text-success fw-semibold"
                          }
                        >
                          {balanceInfo.remaining > 0
                            ? `₱${balanceInfo.remaining.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                },
                              )}`
                            : "₱0.00 (Paid in Full)"}
                        </span>
                      </div>
                    </>
                  }
                </div>

                {/* ALERT BLOCK FOR REJECTED ATTEMPTS */}
                {selectedPayment?.payment_status === "rejected" &&
                  !showRejectForm && (
                    <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-white p-2.5 mb-2 rounded-3">
                      <div className="d-flex align-items-center mb-1 text-danger">
                        <XCircle size={16} className="me-2" />
                        <span className="fw-bold small text-uppercase tracking-wider">
                          Proof Rejected
                        </span>
                      </div>
                      <div
                        className="text-white-50 small mb-2 text-start px-1"
                        style={{ fontSize: "0.8rem" }}
                      >
                        <strong>Reason: </strong>{" "}
                        {selectedPayment.rejection_reason ||
                          "Invalid receipt upload."}
                      </div>
                      <div
                        className="text-warning small d-flex align-items-center bg-warning bg-opacity-10 rounded p-1.5"
                        style={{ fontSize: "0.72rem" }}
                      >
                        <Calendar size={12} className="me-1" />
                        Customer notified. 12-hour grace period active.
                      </div>
                    </div>
                  )}

                {!showRejectForm && (
                  <div className="mt-1 mb-2">
                    {(() => {
                      const receiptUrl = selectedPayment?.receipt_path
                        ? selectedPayment.receipt_path.startsWith("http")
                          ? selectedPayment.receipt_path
                          : selectedPayment.receipt_path.includes("restaurant_")
                            ? `https://res.cloudinary.com/dfajhhh84/image/upload/${selectedPayment.receipt_path}`
                            : `${api.defaults.baseURL?.replace("/api", "") || ""}/uploads/${selectedPayment.receipt_path}`
                        : null;

                      return (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span
                              className="text-white-50 small"
                              style={{ fontSize: "0.8rem" }}
                            >
                              Proof of Payment Attachment
                            </span>
                            {receiptUrl && (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-decoration-none small d-flex align-items-center gap-1 hover-white"
                                style={{
                                  fontSize: "0.75rem",
                                  borderBottom:
                                    "1px dashed rgba(13, 110, 253, 0.3)",
                                }}
                              >
                                <Eye size={12} /> View Full Size
                              </a>
                            )}
                          </div>

                          {selectedPayment?.receipt_path ? (
                            <div className="position-relative">
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Click to view full size"
                              >
                                <img
                                  src={receiptUrl}
                                  alt="Payment receipt"
                                  className="w-100 rounded-3 border border-secondary shadow-sm"
                                  style={{
                                    maxHeight: 140,
                                    objectFit: "contain",
                                    background: "#121212",
                                    cursor: "zoom-in",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Image failed to load:",
                                      e.currentTarget.src,
                                    );
                                    e.currentTarget.src =
                                      "https://placehold.co/400x250/222/888?text=Image+Not+Found";
                                  }}
                                />
                              </a>
                            </div>
                          ) : (
                            <div className="py-3 text-center border border-secondary border-dashed rounded-3 text-white-50 small">
                              No receipt uploaded (Cash / Manual Entry).
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* REJECTION FORM */}
                {showRejectForm && (
                  <div className="card bg-danger bg-opacity-10 border border-danger border-opacity-25 p-2.5 mb-2 rounded-3 animate-fade-in">
                    <div className="text-danger fw-bold small mb-1.5 d-flex align-items-center">
                      <CornerDownRight size={14} className="me-1" /> Specify
                      Rejection Reason
                    </div>
                    <textarea
                      className="form-control form-control-sm bg-dark text-white border-secondary mb-2 shadow-inner"
                      rows="2"
                      style={{ fontSize: "0.85rem", resize: "none" }}
                      placeholder="Write feedback for the customer..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-danger btn-sm fw-bold flex-grow-1"
                        onClick={submitRejection}
                      >
                        Submit Rejection
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm text-white-50"
                        onClick={() => setShowRejectForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTION CONTROLS */}
                <div className="d-grid gap-1.5">
                  {!showRejectForm &&
                    selectedPayment?.payment_status !== "verified" && (
                      <>
                        <button
                          className="btn btn-success fw-bold fs-6 py-2 shadow-sm d-flex align-items-center justify-content-center"
                          onClick={async () => {
                            if (
                              !(await confirm({
                                title: "Verify payment proof",
                                message:
                                  "Mark this proof of payment as verified?",
                                confirmLabel: "Verify payment",
                                variant: "primary",
                              }))
                            )
                              return;
                            try {
                              await api.put(
                                `/billing/verify/${selectedPayment.reservation_id}`,
                                {},
                              );

                              setSelectedPayment((prev) => ({
                                ...prev,
                                payment_status: "verified",
                              }));

                              await fetchPayments();
                              closeBtnRef.current?.click();
                            } catch (err) {
                              showToast("Failed to verify.");
                            }
                          }}
                        >
                          <CheckCircle2 size={16} className="me-2" /> Verify
                          Payment Proof
                        </button>

                        {!isWalkIn &&
                          selectedPayment?.payment_status !== "rejected" && (
                            <button
                              className="btn btn-outline-danger fw-bold py-1.5 border-secondary"
                              onClick={() => setShowRejectForm(true)}
                            >
                              Reject Proof
                            </button>
                          )}
                      </>
                    )}

                  {!showRejectForm &&
                    (balanceInfo.remaining > 0 ? (
                      <>
                        <div className="alert alert-warning border-0 py-2 mb-1">
                          <div className="fw-bold small text-uppercase">
                            Partial bill
                          </div>
                          <small>
                            Collect the remaining balance before settling this
                            bill.
                          </small>
                        </div>
                        <button
                          className="btn btn-primary fw-bold py-2 d-flex align-items-center justify-content-center"
                          onClick={async () => {
                            if (
                              !(await confirm({
                                title: "Settle transaction",
                                message: `Confirm that the remaining balance of ₱${balanceInfo.remaining.toLocaleString(
                                  undefined,
                                  { minimumFractionDigits: 2 },
                                )} has been collected and mark this bill fully paid?`,
                                confirmLabel: "Settle bill",
                                variant: "primary",
                              }))
                            )
                              return;

                            try {
                              const settlementRes = await api.put(
                                `/billing/settle/${selectedPayment.reservation_id}`,
                                {},
                              );

                              setSelectedPayment((prev) => {
                                const total = Number(
                                  prev.total_bill || calculateItemsSum(),
                                );
                                return {
                                  ...prev,
                                  amount: total,
                                  balance_due: 0,
                                  settlement_status: "paid",
                                  order_status:
                                    settlementRes.data.reservation_status ||
                                    prev.order_status,
                                  payment_status: "verified",
                                };
                              });

                              await fetchPayments();
                              showToast("Transaction Settled!", "success");
                            } catch (err) {
                              console.error("Settle error:", err.response?.data);
                              showToast("Failed to settle bill.");
                            }
                          }}
                        >
                          <Layers size={16} className="me-2" /> Settle Bill (Fully
                          Paid)
                        </button>
                      </>
                    ) : (
                      <div className="alert alert-success border-0 py-2 text-center mb-0 d-flex flex-column align-items-center bg-success bg-opacity-10 text-success">
                        <CheckCircle2 size={20} className="mb-1" />
                        <div
                          className="fw-bold small text-uppercase tracking-wide"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Bill Paid in Full
                        </div>
                        <small
                          className="opacity-75"
                          style={{ fontSize: "0.7rem" }}
                        >
                          No remaining balance is due.
                        </small>
                      </div>
                    ))}

                <button
                  className="btn btn-outline-secondary text-white-50 border-0 mt-1 py-2 drawer-footer-action"
                  data-bs-dismiss="offcanvas"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    {takeoutReservationId && (
      <EventTakeoutModal
        reservationId={takeoutReservationId}
        onClose={() => setTakeoutReservationId(null)}
      />
    )}
    </div>
  );
};

export default Billing;
