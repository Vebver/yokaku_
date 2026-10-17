import React, { useEffect, useRef, useState } from "react";
import { Check, Clock3, PackageCheck, RefreshCw, X } from "lucide-react";
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
  const [requestKey, setRequestKey] = useState("");
  const submitLockRef = useRef(false);

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
        requestError.response?.data?.error || "Could not load the package balance.",
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
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.min(quantity, summary?.remaining_quantity || 0),
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

    try {
      if (!(await confirm({
        title: "Confirm takeout request",
        message: `You have ${selectedTotal} remaining item${selectedTotal === 1 ? "" : "s"} from your reserved package. Request them for takeout?`,
        confirmLabel: "Confirm Takeout",
        variant: "primary",
      }))) {
        return;
      }

      setSaving(true);
      setError("");
      const stableRequestKey =
        requestKey ||
        (globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setRequestKey(stableRequestKey);
      const response = await api.post(
        `/reservations/${reservationId}/event-takeout`,
        { items, request_key: stableRequestKey },
      );
      setSummary(response.data);
      setQuantities({});
      setRequestKey("");
    } catch (requestError) {
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
            <RefreshCw size={22} className="spinner-border" /> Loading package balance
          </div>
        ) : summary ? (
          <>
            <div className="event-takeout-summary">
              <div><span>Package price</span><strong>₱{Number(summary.package_price || 0).toLocaleString()}</strong></div>
              <div><span>Paid</span><strong>₱{Number(summary.amount_paid || 0).toLocaleString()}</strong></div>
              <div><span>Package limit</span><strong>{summary.package_limit}</strong></div>
              <div><span>Consumed</span><strong>{summary.served_quantity}</strong></div>
              <div><span>Dine-in in progress</span><strong>{summary.pending_dine_in_quantity}</strong></div>
              <div><span>Takeout requested</span><strong>{summary.takeout_requested_quantity}</strong></div>
              <div><span>Takeout preparing</span><strong>{summary.takeout_preparing_quantity}</strong></div>
              <div><span>Takeout ready</span><strong>{summary.takeout_ready_quantity}</strong></div>
              <div><span>Takeout given</span><strong>{summary.takeout_given_quantity}</strong></div>
              <div className="event-takeout-remaining">
                <span>Available to request</span>
                <strong>{summary.remaining_quantity}</strong>
              </div>
            </div>

            {summary.package_complete && (
              <div className="event-takeout-complete">
                <PackageCheck size={18} /> Package fully used
              </div>
            )}
            {customerMode &&
              String(summary.payment_status || "").toLowerCase() !== "verified" && (
                <div className="event-takeout-error" role="status">
                  Takeout is available after the reservation payment is verified.
                </div>
              )}

            <div className="event-takeout-content">
              <section className="event-takeout-menu-section">
                <div className="event-takeout-section-heading">
                  <div>
                    <h3>Select menu items</h3>
                        <p>Choose up to {summary.remaining_quantity} remaining item(s).</p>
                  </div>
                  <span>{selectedTotal} selected</span>
                </div>
                {summary.menu_items.length === 0 ? (
                  <p className="event-takeout-empty">No available menu items.</p>
                ) : (
                  <div className="event-takeout-menu-list">
                    {summary.menu_items.map((item) => (
                      <label className="event-takeout-menu-row" key={item.item_id}>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.category}</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={summary.remaining_quantity}
                          step="1"
                          aria-label={`Takeout quantity for ${item.name}`}
                          value={quantities[item.item_id] || ""}
                          placeholder="0"
                          disabled={saving || summary.remaining_quantity === 0}
                          onChange={(event) => setQuantity(item.item_id, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {selectedTotal > summary.remaining_quantity && (
                  <p className="event-takeout-error">Selected quantity exceeds the package balance.</p>
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
                          <span>Request #{takeout.takeout_id} · {takeout.quantity} meals</span>
                          <span className={`event-takeout-status status-${takeout.status}`}>
                            {takeout.status === "ready" ? <Check size={13} /> : <Clock3 size={13} />}
                            {STATUS_LABELS[takeout.status] || takeout.status}
                          </span>
                        </div>
                        <ul>
                          {takeout.items.map((item) => (
                            <li key={`${takeout.takeout_id}-${item.item_id}`}>
                              {item.quantity} × {item.name}
                            </li>
                          ))}
                        </ul>
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
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-warning fw-bold"
                onClick={submitRequest}
                disabled={saving || selectedTotal < 1 || selectedTotal > summary.remaining_quantity || (customerMode && String(summary.payment_status || "").toLowerCase() !== "verified")}
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
