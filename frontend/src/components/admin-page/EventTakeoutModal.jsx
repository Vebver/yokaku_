import React, { useEffect, useRef, useState } from "react";
import { Check, Clock3, RefreshCw, X } from "lucide-react";
import io from "socket.io-client";
import api, { SOCKET_URL } from "../../api";
import { useConfirmation } from "../ConfirmationContext";
import "../../Style/EventTakeout.css";

const STATUS_LABELS = {
  requested: "Takeout Requested",
  preparing: "Takeout Preparing",
  ready: "Takeout Ready",
  completed: "Takeout Completed",
};

const EventTakeoutModal = ({ reservationId, onClose, customerMode = false }) => {
  const { confirm } = useConfirmation();
  const [summary, setSummary] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitLockRef = useRef(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const loadSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(
        `/reservations/${reservationId}/event-takeout`,
      );
      setSummary(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          (requestError.response
            ? `Takeout service returned HTTP ${requestError.response.status}. Deploy the updated backend if this route is unavailable.`
            : "Could not connect to the takeout service."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [reservationId]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    const refreshTakeout = (payload) => {
      if (String(payload?.reservationId) === String(reservationId)) {
        loadSummary();
      }
    };
    socket.on("event_takeout_updated", refreshTakeout);
    return () => {
      socket.off("event_takeout_updated", refreshTakeout);
      socket.disconnect();
    };
  }, [reservationId]);

  const selectedTotal = Object.values(quantities).reduce(
    (sum, quantity) => sum + (Number(quantity) || 0),
    0,
  );

  const setQuantity = (itemId, rawValue) => {
    const quantity = Math.max(0, Number.parseInt(rawValue, 10) || 0);
    const item = summary?.menu_items.find(
      (menuItem) => String(menuItem.item_id) === String(itemId),
    );
    const available = Number(item?.available_quantity) || 0;
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.min(quantity, available),
    }));
  };

  const submitRequest = async () => {
    if (submitLockRef.current) return;
    const items = Object.entries(quantities)
      .map(([itemId, quantity]) => ({
        item_id: Number(itemId),
        quantity: Number(quantity) || 0,
      }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    submitLockRef.current = true;
    let requestKeyStorageKey = null;

    try {
      if (!(await confirm({
        title: "Confirm takeout request",
        message: `Request ${selectedTotal} item${selectedTotal === 1 ? "" : "s"} with a menu value of ₱${selectedValue.toFixed(2)}? This is covered by the existing reservation and adds no payment.`,
        confirmLabel: "Confirm Takeout",
        variant: "primary",
      }))) {
        return;
      }

      setSaving(true);
      setError("");
      const selectionFingerprint = items
        .slice()
        .sort((a, b) => a.item_id - b.item_id)
        .map((item) => `${item.item_id}:${item.quantity}`)
        .join("|");
      requestKeyStorageKey =
        `event_takeout_request_key_${reservationId}_${selectionFingerprint}`;
      const stableRequestKey =
        sessionStorage.getItem(requestKeyStorageKey) ||
        (globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(requestKeyStorageKey, stableRequestKey);
      const response = await api.post(
        `/reservations/${reservationId}/event-takeout`,
        { items, request_key: stableRequestKey },
      );
      setSummary(response.data);
      setQuantities({});
      sessionStorage.removeItem(requestKeyStorageKey);
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status >= 400 && status < 500 && requestKeyStorageKey) {
        sessionStorage.removeItem(requestKeyStorageKey);
      }
      setError(
        requestError.response?.data?.error || "Could not request takeout.",
      );
      await loadSummary();
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const completeTakeout = async (takeoutId) => {
    setSaving(true);
    setError("");
    try {
      const response = await api.put(
        `/orders/event-takeouts/${takeoutId}/status`,
        { status: "completed" },
      );
      setSummary(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Could not complete takeout.",
      );
      await loadSummary();
    } finally {
      setSaving(false);
    }
  };

  const selectedValue = (summary?.menu_items || []).reduce((sum, item) => {
    const quantity = Number(quantities[item.item_id]) || 0;
    return sum + Number(item.unit_price || 0) * quantity;
  }, 0);
  const exceedsAvailable =
    Boolean(summary) && selectedTotal > Number(summary.remaining_quantity || 0);

  const visibleMenuItems = (summary?.menu_items || []).filter((item) => {
    if (!appliedSearch) return true;
    const haystack = `${item.name} ${item.category}`.toLowerCase();
    return haystack.includes(appliedSearch.toLowerCase());
  });

  return (
    <div
      className="event-takeout-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="event-takeout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-takeout-title"
      >
        <header className="event-takeout-header">
          <div>
            <span className="event-takeout-eyebrow">{customerMode ? "YOUR RESERVED PACKAGE" : "RESERVED EVENT"} · {reservationId}</span>
            <h2 id="event-takeout-title">{customerMode ? "Request Takeout" : "Manage Takeout"}</h2>
            {summary && <p>{summary.package_name}</p>}
          </div>
          <button
            type="button"
            className="event-takeout-close"
            onClick={onClose}
            aria-label="Close takeout manager"
          >
            <X size={20} />
          </button>
        </header>

        {error && <div className="event-takeout-error" role="alert">{error}</div>}

        {loading ? (
          <div className="event-takeout-loading">
            <RefreshCw size={22} className="spinner-border" /> Loading eligible takeout items
          </div>
        ) : summary ? (
          <>
            <div className="event-takeout-summary">
              <div><span>Customer</span><strong>{summary.customer_name || "Guest"}</strong></div>
              <div><span>Reservation</span><strong>{summary.reservation_id}</strong></div>
              <div><span>Package</span><strong>{summary.package_name}</strong></div>
              <div><span>Payment</span><strong>{summary.package_paid ? "PAID" : "NOT PAID"}</strong></div>
              <div><span>Paid amount</span><strong>₱{Number(summary.amount_paid || 0).toLocaleString()}</strong></div>
            </div>

            {!summary.package_paid && (
                <div className="event-takeout-error" role="status">
                  Takeout is available after the package is paid in full and verified.
                </div>
              )}

            <div className="event-takeout-content">
              <section className="event-takeout-menu-section">
                <div className="event-takeout-section-heading">
                  <div>
                    <h3>Available takeout items</h3>
                    <p>Menu prices are shown for reference. No additional payment is created.</p>
                  </div>
                  <span>{selectedTotal} selected</span>
                </div>
                <form
                  className="event-takeout-search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setAppliedSearch(searchInput.trim());
                  }}
                >
                  <label htmlFor="event-takeout-search">Search menu item</label>
                  <div>
                    <input
                      id="event-takeout-search"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Menu name or category"
                    />
                    <button type="submit" className="btn btn-outline-secondary">Search</button>
                  </div>
                </form>
                {visibleMenuItems.length === 0 ? (
                  <p className="event-takeout-empty">No available menu items.</p>
                ) : (
                  <div className="event-takeout-menu-list">
                    {visibleMenuItems.map((item) => (
                      <label className="event-takeout-menu-row" key={item.item_id}>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.category}</small>
                          <small>₱{Number(item.unit_price || 0).toFixed(2)} each · Available: {item.available_quantity}</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={item.available_quantity}
                          step="1"
                          aria-label={`Takeout quantity for ${item.name}`}
                          value={quantities[item.item_id] || ""}
                          placeholder="0"
                          disabled={saving || item.available_quantity === 0}
                          onChange={(event) => setQuantity(item.item_id, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {exceedsAvailable && (
                  <p className="event-takeout-error">
                    Selected quantities exceed the currently available amount.
                  </p>
                )}
              </section>

              <section className="event-takeout-requests">
                <h3>Takeout activity</h3>
                {summary.takeouts.length === 0 ? (
                  <p className="event-takeout-empty">No takeout requests yet.</p>
                ) : (
                  <div className="event-takeout-request-list">
                    {summary.takeouts.map((takeout) => (
                      <article className="event-takeout-request" key={takeout.takeout_id}>
                        <div className="event-takeout-request-head">
                          <span>Request #{takeout.takeout_id} · {takeout.quantity} items</span>
                          <span className={`event-takeout-status status-${takeout.status}`}>
                            {takeout.status === "ready" ? <Check size={13} /> : <Clock3 size={13} />}
                            {STATUS_LABELS[takeout.status] || takeout.status}
                          </span>
                        </div>
                        <ul>
                          {takeout.items.map((item) => (
                            <li key={`${takeout.takeout_id}-${item.item_id}`}>
                              {item.name} · ₱{Number(item.unit_price || 0).toFixed(2)} × {item.quantity} = ₱{Number(item.line_value || 0).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                        <strong>Takeout value: ₱{Number(takeout.takeout_value || 0).toFixed(2)}</strong>
                        {!customerMode && takeout.status === "ready" && (
                          <button
                            type="button"
                            className="event-takeout-complete-button"
                            onClick={() => completeTakeout(takeout.takeout_id)}
                            disabled={saving}
                          >
                            Mark Takeout Completed
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="event-takeout-footer">
              <div className="event-takeout-value">
                <span>Takeout value</span>
                <strong>₱{selectedValue.toFixed(2)}</strong>
                <small>Reference value only · Additional payment: ₱0.00</small>
              </div>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-warning fw-bold"
                onClick={submitRequest}
                disabled={saving || selectedTotal < 1 || exceedsAvailable || !summary.package_paid}
              >
                {saving ? "Saving..." : `Request Takeout (${selectedTotal})`}
              </button>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  );
};

export default EventTakeoutModal;
