const db = require("../config/db");
const { calculateRemainingPackageQuantity } = require("../utils/packageBalance");
const { calculateTakeoutValue } = require("../utils/takeoutPricing");

const EVENT_MEAL_LIMIT = 20;
const PACKAGE_PRICES = {
  "standard package": 10000,
  "premium package": 12500,
};
const ACTIVE_TAKEOUT_STATUSES = ["requested", "preparing", "ready"];
const PACKAGE_MENU_EXCLUSION =
  "COALESCE(LOWER(TRIM(c.category_name)), '') NOT LIKE '%unlimited%'";
const VALID_TRANSITIONS = {
  requested: "preparing",
  preparing: "ready",
  ready: "completed",
};

const packagePrice = (packageName) => {
  const normalizedName = String(packageName || "").trim().toLowerCase();
  if (normalizedName.includes("premium")) return PACKAGE_PRICES["premium package"];
  if (normalizedName.includes("standard")) return PACKAGE_PRICES["standard package"];
  return 0;
};

const packageMealLimit = (packageName) =>
  packagePrice(packageName) > 0 ? EVENT_MEAL_LIMIT : 0;

const getReservation = async (conn, reservationId, lock = false, requester = null) => {
  const [rows] = await conn.execute(
        `SELECT r.reservation_id, r.user_id, r.first_name, r.last_name,
          r.reservation_type, r.package_name, r.status,
          p.payment_id, p.amount AS amount_paid, p.payment_status
     FROM reservations r
     LEFT JOIN payments p ON p.reservation_id = r.reservation_id
     WHERE r.reservation_id = ?${lock ? " FOR UPDATE" : ""}`,
    [reservationId],
  );
  const reservation = rows[0];
  if (!reservation) throw new Error("Reserved event not found.");
  const staffRoles = ["admin", "cashier", "staff", "cook"];
  if (
    requester &&
    !staffRoles.includes(String(requester.role || "").toLowerCase()) &&
    (!requester.userId || String(reservation.user_id) !== String(requester.userId))
  ) {
    throw new Error("You can only access takeout for your own reservation.");
  }
  if (
    String(reservation.reservation_type || "").toLowerCase() !== "event" ||
    packageMealLimit(reservation.package_name) === 0
  ) {
    throw new Error("Takeout is only available for Standard or Premium events.");
  }
  if (String(reservation.status || "").toLowerCase() !== "seated") {
    throw new Error("Takeout is available only after the event is seated.");
  }
  return {
    ...reservation,
    package_meal_limit: packageMealLimit(reservation.package_name),
    package_price: packagePrice(reservation.package_name),
  };
};

const getSummaryForReservation = async (conn, reservation) => {
  const reservationId = reservation.reservation_id;
  const [[orderTotals], [requestTotals], [requestRows], [menuItems]] =
    await Promise.all([
      conn.execute(
        `SELECT
           COALESCE(SUM(CASE
             WHEN LOWER(ko.kitchen_status) IN ('served', 'completed')
             THEN ko.quantity ELSE 0 END), 0) AS served_quantity,
           COALESCE(SUM(CASE
             WHEN LOWER(ko.kitchen_status) IN ('pending', 'preparing', 'ready')
             THEN ko.quantity ELSE 0 END), 0) AS pending_quantity
         FROM kiosk_orders ko
         JOIN menu_items mi ON mi.item_id = ko.item_id
         LEFT JOIN categories c ON c.category_id = mi.category_id
         WHERE ko.reservation_id = ?
           AND COALESCE(ko.is_refill, 0) = 0
           AND ${PACKAGE_MENU_EXCLUSION}`,
        [reservationId],
      ),
      conn.execute(
        `SELECT status, COALESCE(SUM(quantity), 0) AS quantity
         FROM event_takeout_requests
         WHERE reservation_id = ?
         GROUP BY status`,
        [reservationId],
      ),
      conn.execute(
        `SELECT r.takeout_id, r.status, r.quantity, r.requested_at,
                i.menu_item_id, i.quantity AS item_quantity,
                COALESCE(mi.menu_name, CONCAT('Menu item ', i.menu_item_id)) AS item_name,
                i.unit_price AS unit_price
         FROM event_takeout_requests r
         JOIN event_takeout_items i ON i.takeout_id = r.takeout_id
         LEFT JOIN menu_items mi ON mi.item_id = i.menu_item_id
         WHERE r.reservation_id = ?
         ORDER BY r.requested_at DESC, r.takeout_id DESC, i.takeout_item_id ASC`,
        [reservationId],
      ),
      conn.execute(
        `SELECT mi.item_id, mi.menu_name, c.category_name, mi.price
         FROM menu_items mi
         LEFT JOIN categories c ON c.category_id = mi.category_id
         WHERE COALESCE(mi.is_available, 1) = 1
           AND ${PACKAGE_MENU_EXCLUSION}
         ORDER BY c.category_name, mi.menu_name`,
      ),
    ]);

  const quantitiesByStatus = Object.fromEntries(
    requestTotals.map((row) => [String(row.status).toLowerCase(), Number(row.quantity) || 0]),
  );
  const servedQuantity = Number(orderTotals?.served_quantity) || 0;
  const pendingQuantity = Number(orderTotals?.pending_quantity) || 0;
  const takeoutRequestedQuantity = quantitiesByStatus.requested || 0;
  const takeoutPreparingQuantity = quantitiesByStatus.preparing || 0;
  const takeoutReadyQuantity = quantitiesByStatus.ready || 0;
  const takeoutGivenQuantity = quantitiesByStatus.completed || 0;
  const takeoutReservedQuantity =
    takeoutRequestedQuantity + takeoutPreparingQuantity + takeoutReadyQuantity;
  const fulfilledQuantity = servedQuantity + takeoutGivenQuantity;
  const remainingQuantity = calculateRemainingPackageQuantity({
    packageLimit: reservation.package_meal_limit,
    servedQuantity,
    pendingDineInQuantity: pendingQuantity,
    takeoutReservedQuantity,
  });

  const takeoutsById = new Map();
  for (const row of requestRows) {
    if (!takeoutsById.has(row.takeout_id)) {
      takeoutsById.set(row.takeout_id, {
        takeout_id: row.takeout_id,
        status: row.status,
        quantity: Number(row.quantity) || 0,
        requested_at: row.requested_at,
        takeout_value: 0,
        items: [],
      });
    }
    takeoutsById.get(row.takeout_id).items.push({
      item_id: row.menu_item_id,
      name: row.item_name,
      quantity: Number(row.item_quantity) || 0,
      unit_price: Number(row.unit_price) || 0,
      line_value: calculateTakeoutValue([
        { unit_price: row.unit_price, quantity: row.item_quantity },
      ]),
    });
  }
  for (const takeout of takeoutsById.values()) {
    takeout.takeout_value = calculateTakeoutValue(takeout.items);
  }
  const takeoutValue = calculateTakeoutValue(
    [...takeoutsById.values()].flatMap((takeout) => takeout.items),
  );

  return {
    reservation_id: reservationId,
    payment_id: reservation.payment_id,
    customer_name: [reservation.first_name, reservation.last_name]
      .filter(Boolean)
      .join(" "),
    reservation_status: reservation.status,
    package_name: reservation.package_name,
    package_price: reservation.package_price,
    amount_paid: Number(reservation.amount_paid) || 0,
    payment_status: reservation.payment_status,
    package_paid:
      String(reservation.payment_status || "").toLowerCase() === "verified" &&
      Number(reservation.amount_paid || 0) >= reservation.package_price,
    additional_payment: 0,
    package_limit: reservation.package_meal_limit,
    served_quantity: servedQuantity,
    pending_dine_in_quantity: pendingQuantity,
    takeout_requested_quantity: takeoutRequestedQuantity,
    takeout_preparing_quantity: takeoutPreparingQuantity,
    takeout_ready_quantity: takeoutReadyQuantity,
    takeout_given_quantity: takeoutGivenQuantity,
    remaining_quantity: remainingQuantity,
    package_used_quantity: fulfilledQuantity,
    package_complete: fulfilledQuantity >= reservation.package_meal_limit,
    menu_items: menuItems.map((item) => ({
      item_id: item.item_id,
      name: item.menu_name,
      category: item.category_name || "Uncategorised",
      unit_price: Number(item.price) || 0,
      available_quantity: remainingQuantity,
    })),
    takeout_value: takeoutValue,
    takeouts: [...takeoutsById.values()],
  };
};

const EventTakeout = {
  getSummary: async (reservationId, requester = null) => {
    const conn = await db.getConnection();
    try {
      const reservation = await getReservation(conn, reservationId, false, requester);
      return await getSummaryForReservation(conn, reservation);
    } finally {
      conn.release();
    }
  },

  createRequest: async (reservationId, requestedItems, requestedBy, requestKey, requester = null) => {
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
      throw new Error("Select at least one takeout item.");
    }

    const quantities = new Map();
    for (const item of requestedItems) {
      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new Error("The takeout request contains an invalid menu item.");
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Takeout quantities must be positive whole numbers.");
      }
      quantities.set(itemId, (quantities.get(itemId) || 0) + quantity);
    }

    const totalQuantity = [...quantities.values()].reduce((sum, value) => sum + value, 0);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const reservation = await getReservation(conn, reservationId, true, requester);
      if (requestKey) {
        const [existingRequests] = await conn.execute(
          `SELECT takeout_id FROM event_takeout_requests
           WHERE reservation_id = ? AND request_key = ? LIMIT 1`,
          [reservationId, requestKey],
        );
        if (existingRequests.length > 0) {
          await conn.commit();
          return await getSummaryForReservation(conn, reservation);
        }
      }

      if (
        String(reservation.payment_status || "").toLowerCase() !== "verified" ||
        Number(reservation.amount_paid || 0) < reservation.package_price
      ) {
        throw new Error("Takeout is available after the package is paid in full and verified.");
      }

      const summary = await getSummaryForReservation(conn, reservation);
      if (totalQuantity > summary.remaining_quantity) {
        throw new Error(
          `Only ${summary.remaining_quantity} meal${summary.remaining_quantity === 1 ? "" : "s"} remain in this package.`,
        );
      }

      const ids = [...quantities.keys()];
      const placeholders = ids.map(() => "?").join(",");
      const [availableItems] = await conn.execute(
        `SELECT mi.item_id, mi.price FROM menu_items mi
         LEFT JOIN categories c ON c.category_id = mi.category_id
         WHERE mi.item_id IN (${placeholders})
           AND COALESCE(mi.is_available, 1) = 1
           AND ${PACKAGE_MENU_EXCLUSION}`,
        ids,
      );
      if (availableItems.length !== ids.length) {
        throw new Error("One or more selected menu items are unavailable.");
      }
      const pricesByItem = new Map(
        availableItems.map((item) => [Number(item.item_id), Number(item.price) || 0]),
      );

      const [result] = await conn.execute(
        `INSERT INTO event_takeout_requests
          (reservation_id, quantity, status, requested_by, request_key)
         VALUES (?, ?, 'requested', ?, ?)`,
        [reservationId, totalQuantity, requestedBy || null, requestKey || null],
      );
      for (const [itemId, quantity] of quantities) {
        await conn.execute(
          `INSERT INTO event_takeout_items
            (takeout_id, menu_item_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [result.insertId, itemId, quantity, pricesByItem.get(itemId)],
        );
      }
      await conn.commit();
      return await getSummaryForReservation(conn, reservation);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  updateStatus: async (takeoutId, nextStatus) => {
    if (!Object.hasOwn(VALID_TRANSITIONS, nextStatus)) {
      throw new Error("Invalid takeout status.");
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT takeout_id, reservation_id, status
         FROM event_takeout_requests
         WHERE takeout_id = ?
         FOR UPDATE`,
        [takeoutId],
      );
      const request = rows[0];
      if (!request) throw new Error("Takeout request not found.");
      if (VALID_TRANSITIONS[String(request.status).toLowerCase()] !== nextStatus) {
        throw new Error("This takeout request cannot move to that status.");
      }
      await conn.execute(
        `UPDATE event_takeout_requests
         SET status = ?, completed_at = ${nextStatus === "completed" ? "NOW()" : "NULL"}
         WHERE takeout_id = ?`,
        [nextStatus, takeoutId],
      );
      await conn.commit();
      const reservation = await getReservation(conn, request.reservation_id);
      return {
        reservation_id: request.reservation_id,
        summary: await getSummaryForReservation(conn, reservation),
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  getActiveRequests: async () => {
    const conn = await db.getConnection();
    try {
      const [requests] = await conn.execute(
        `SELECT r.takeout_id, r.reservation_id, r.quantity, r.status,
                r.requested_at, r.updated_at, r.completed_at,
          rs.package_name, rs.first_name, rs.last_name, p.payment_id
         FROM event_takeout_requests r
         JOIN reservations rs ON rs.reservation_id = r.reservation_id
         LEFT JOIN payments p ON p.reservation_id = rs.reservation_id
         WHERE r.status IN ('requested', 'preparing', 'ready')
         ORDER BY r.requested_at ASC, r.takeout_id ASC`,
      );
      if (requests.length === 0) return [];
      const ids = requests.map((request) => request.takeout_id);
      const placeholders = ids.map(() => "?").join(",");
      const [items] = await conn.execute(
        `SELECT i.takeout_id, i.menu_item_id, i.quantity,
                i.unit_price AS unit_price,
                COALESCE(mi.menu_name, CONCAT('Menu item ', i.menu_item_id)) AS name
         FROM event_takeout_items i
         LEFT JOIN menu_items mi ON mi.item_id = i.menu_item_id
         WHERE i.takeout_id IN (${placeholders})
         ORDER BY i.takeout_id, i.takeout_item_id`,
        ids,
      );
      const itemsByRequest = new Map();
      for (const item of items) {
        if (!itemsByRequest.has(item.takeout_id)) itemsByRequest.set(item.takeout_id, []);
        itemsByRequest.get(item.takeout_id).push({
          item_id: item.menu_item_id,
          name: item.name,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          line_value: calculateTakeoutValue([item]),
        });
      }
      return requests.map((request) => {
        const items = itemsByRequest.get(request.takeout_id) || [];
        return {
          ...request,
          customer_name: [request.first_name, request.last_name]
            .filter(Boolean)
            .join(" "),
          takeout_value: calculateTakeoutValue(items),
          items,
        };
      });
    } finally {
      conn.release();
    }
  },
};

module.exports = EventTakeout;
