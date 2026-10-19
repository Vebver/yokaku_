import axios from "axios";
import { API_BASE } from "../api";

const QUEUE_KEY = "kiosk_pending_order_queue_v1";
// Queued orders older than this are dropped: a food order queued that long is
// stale and useless (the guest's session would be over by the time it syncs).
const QUEUE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
let isSyncing = false;

const readQueue = () => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!Array.isArray(queue)) return [];
    return pruneExpired(queue);
  } catch {
    return [];
  }
};

const pruneExpired = (queue) => {
  const cutoff = Date.now() - QUEUE_EXPIRY_MS;
  const fresh = queue.filter(
    (entry) => entry.status !== "pending" ||
      new Date(entry.queuedAt).getTime() > cutoff,
  );
  if (fresh.length !== queue.length) {
    writeQueue(fresh);
    fresh
      .filter((entry) => !queue.includes(entry))
      .forEach((dropped) =>
        dispatchQueueEvent("kiosk-order-expired", dropped),
      );
  }
  return fresh;
};

const writeQueue = (queue) =>
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

const makeIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `kiosk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token && token !== "null" && token !== "undefined"
    ? { Authorization: `Bearer ${token}` }
    : {};
};

const dispatchQueueEvent = (name, detail) =>
  window.dispatchEvent(new CustomEvent(name, { detail }));

const enqueueOrder = (payload, idempotencyKey) => {
  const queue = readQueue();
  if (!queue.some((entry) => entry.idempotencyKey === idempotencyKey)) {
    queue.push({
      idempotencyKey,
      payload,
      queuedAt: new Date().toISOString(),
      attempt_count: 0,
      status: "pending",
    });
    writeQueue(queue);
  }
};

export const submitKioskOrder = async (payload, headers = {}) => {
  const idempotencyKey = makeIdempotencyKey();
  if (!navigator.onLine) {
    enqueueOrder(payload, idempotencyKey);
    return { queued: true, idempotencyKey };
  }

  try {
    const response = await axios.post(`${API_BASE}/orders/place`, payload, {
      headers: { ...(headers.headers || headers), "Idempotency-Key": idempotencyKey },
      timeout: 10000,
    });
    return { queued: false, response, idempotencyKey };
  } catch (error) {
    if (!error.response || error.response.status >= 500) {
      enqueueOrder(payload, idempotencyKey);
      return { queued: true, idempotencyKey };
    }
    throw error;
  }
};

export const syncPendingKioskOrders = async () => {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
    const pending = readQueue().filter((entry) => entry.status === "pending");
    for (const entry of pending) {
      try {
        await axios.post(`${API_BASE}/orders/place`, entry.payload, {
          headers: {
            ...getAuthHeaders(),
            "Idempotency-Key": entry.idempotencyKey,
          },
          timeout: 10000,
        });
        writeQueue(
          readQueue().filter(
            (queued) => queued.idempotencyKey !== entry.idempotencyKey,
          ),
        );
        dispatchQueueEvent("kiosk-order-synced", entry);
      } catch (error) {
        if (!error.response) break;

        const status = error.response.status;
        if (status === 429) continue;

        const message =
          error.response.data?.error || "The queued order needs staff attention.";
        if (status >= 500) {
          const attemptCount = Number(entry.attempt_count || 0) + 1;
          const needsAttention = attemptCount >= 5;
          writeQueue(
            readQueue().map((queued) =>
              queued.idempotencyKey === entry.idempotencyKey
                ? {
                    ...queued,
                    attempt_count: attemptCount,
                    ...(needsAttention
                      ? { status: "needs_attention", error: message }
                      : { last_error: message }),
                  }
                : queued,
            ),
          );
          if (needsAttention) {
            dispatchQueueEvent("kiosk-order-sync-failed", {
              ...entry,
              attempt_count: attemptCount,
              error: message,
            });
          }
          continue;
        }

        writeQueue(
          readQueue().map((queued) =>
            queued.idempotencyKey === entry.idempotencyKey
              ? { ...queued, status: "needs_attention", error: message }
              : queued,
          ),
        );
        dispatchQueueEvent("kiosk-order-sync-failed", { ...entry, error: message });
      }
    }
  } finally {
    isSyncing = false;
  }
};

export const getQueuedKioskOrders = () => readQueue();

export const getQueuedOrderItemsForReservation = (reservationId) => {
  if (!reservationId) return [];
  let products = [];
  try {
    products = JSON.parse(localStorage.getItem("kiosk_menu_cache") || "[]");
  } catch {}

  return readQueue()
    .filter(
      (entry) =>
        String(entry.payload?.reservation_id) === String(reservationId),
    )
    .flatMap((entry) =>
      (entry.payload.items || []).map((item) => {
        const product = products.find(
          (candidate) => Number(candidate.item_id) === Number(item.item_id),
        );
        return {
          ...item,
          id: item.item_id,
          name: product?.menu_name || product?.name || `Menu item ${item.item_id}`,
          price: product?.price ?? 0,
          is_placed: true,
          local_queue_key: entry.idempotencyKey,
          sync_error: entry.error || null,
        };
      }),
    );
};