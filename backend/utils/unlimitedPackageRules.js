const PACKAGE_MODES = new Set([
  "unlimited_wings_a",
  "unlimited_wings_b",
  "unlimited_wings_c",
]);

const isChickenCategory = (category) =>
  /chicken|wing/i.test(String(category || ""));

const isDrinkCategory = (category) =>
  /drink|beverage|juice/i.test(String(category || ""));

const isWingItem = (item) =>
  /chicken wings/i.test(String(item.category_name || "")) ||
  /wing/i.test(String(item.menu_name || ""));

const isJuice = (item) =>
  /juice|lemonade|orange|calamansi|iced tea/i.test(
    `${item.menu_name || ""} ${item.category_name || ""}`,
  );

const isRice = (item) =>
  /^(?:unlimited\s+)?(?:steamed\s+)?rice$/i.test(
    String(item.menu_name || "").trim(),
  );

const matchesPackageCard = (item, mode) => {
  const name = String(item.menu_name || "").toLowerCase();
  if (!name.includes("unlimited")) return false;
  if (mode === "unlimited_wings_a") return !/\b(?:b|c)\b/.test(name);
  if (mode === "unlimited_wings_b") return /\bb\b/.test(name);
  return /\bc\b/.test(name);
};

const inferPackageMode = (name) => {
  const normalized = String(name || "").toLowerCase();
  if (!normalized.includes("unlimited")) return null;
  if (/\bc\b/.test(normalized)) return "unlimited_wings_c";
  if (/\bb\b/.test(normalized)) return "unlimited_wings_b";
  return "unlimited_wings_a";
};

const isIncluded = (item, mode) => {
  const category = String(item.category_name || "").toLowerCase();
  if (category.includes("unlimited")) return matchesPackageCard(item, mode);
  if (isChickenCategory(category)) {
    return mode === "unlimited_wings_a" || isWingItem(item);
  }
  if (isDrinkCategory(category)) {
    return mode === "unlimited_wings_a" || isJuice(item);
  }
  if (
    (mode === "unlimited_wings_a" || mode === "unlimited_wings_b") &&
    isRice(item)
  ) {
    return true;
  }
  return (
    mode === "unlimited_wings_c" &&
    (/pasta/i.test(category) ||
      (/fries|nachos/i.test(category) &&
        /fries|nachos/i.test(String(item.menu_name || "")) &&
        !/fish/i.test(String(item.menu_name || ""))))
  );
};

const unpackCustomizations = (value) => {
  if (typeof value !== "string") return value || "";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : parsed;
  } catch {
    return value;
  }
};

const getSelectedFlavors = (value) => {
  const customizations = unpackCustomizations(value);
  if (customizations && typeof customizations === "object") {
    return Array.isArray(customizations.flavors) ? customizations.flavors : [];
  }
  const match = String(customizations).match(/flavors\s*:\s*([^|]+)/i);
  return match ? match[1].split(",").map((flavor) => flavor.trim()).filter(Boolean) : [];
};

const getSelectedDrink = (value) => {
  const customizations = unpackCustomizations(value);
  if (customizations && typeof customizations === "object") {
    return String(customizations.drink || "").trim();
  }
  const match = String(customizations).match(/drink\s*:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
};

const readKioskMode = async (conn, reservationId, tableId, items = []) => {
  if (reservationId) {
    const [reservationRows] = await conn.execute(
      `SELECT rt.table_id AS kiosk_table_id, rt.kiosk_mode, r.package_name
       FROM reservations r
       LEFT JOIN reservation_tables rt ON rt.reservation_id = r.reservation_id
       WHERE r.reservation_id = ?
       ORDER BY rt.check_in_time DESC LIMIT 1`,
      [reservationId],
    );
    if (reservationRows.length) {
      const mode = reservationRows[0].kiosk_mode || "default";
      if (mode !== "default") return mode;
      const packageMode = inferPackageMode(reservationRows[0].package_name);
      if (packageMode) return packageMode;

      const [packageItems] = await conn.execute(
        `SELECT mi.menu_name FROM kiosk_orders ko
         JOIN menu_items mi ON mi.item_id = ko.item_id
         JOIN categories c ON c.category_id = mi.category_id
         WHERE ko.reservation_id = ? AND c.category_name LIKE '%Unlimited%'
         ORDER BY ko.created_at ASC LIMIT 1`,
        [reservationId],
      );
      const packageItemMode = inferPackageMode(packageItems[0]?.menu_name);
      if (packageItemMode) return packageItemMode;
      if (reservationRows[0].kiosk_table_id != null) return "default";
    }
  }

  if (tableId) {
    const [tableRows] = await conn.execute(
      `SELECT kiosk_mode FROM reservation_tables
       WHERE table_id = ? AND LOWER(status) IN ('seated', 'confirmed')
       ORDER BY check_in_time DESC LIMIT 1`,
      [tableId],
    );
    const mode = tableRows[0]?.kiosk_mode || "default";
    if (mode !== "default") return mode;
  }

  const requestedIds = [...new Set(
    (items || []).map((item) => Number(item.item_id || item.id)).filter(Number.isInteger),
  )];
  if (requestedIds.length) {
    const placeholders = requestedIds.map(() => "?").join(",");
    const [requestedRows] = await conn.execute(
      `SELECT mi.menu_name, c.category_name
       FROM menu_items mi
       LEFT JOIN categories c ON c.category_id = mi.category_id
       WHERE mi.item_id IN (${placeholders})`,
      requestedIds,
    );
    const requestedPackage = requestedRows.find((item) =>
      String(item.category_name || "").toLowerCase().includes("unlimited"),
    );
    const requestedMode = inferPackageMode(requestedPackage?.menu_name);
    if (requestedMode) return requestedMode;
  }
  return "default";
};

const validateUnlimitedPackageOrder = async (
  conn,
  { reservationId, tableId, items },
) => {
  const mode = await readKioskMode(conn, reservationId, tableId, items);
  if (!PACKAGE_MODES.has(mode)) return { mode };
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("An order must contain at least one item.");
  }
  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Order item quantities must be positive whole numbers.");
    }
  }

  // Prefer DB-driven inclusions for this package (set by the Admin in
  // Product Management). Falls back to the legacy category rules when the
  // package has no configured inclusions.
  const packageItemIds = items
    .map((item) => Number(item.item_id || item.id))
    .filter(Number.isInteger);
  let dbInclusions = null;
  let packageCardItemId = null;
  const [packageCardRows] = await conn.execute(
    `SELECT mi.item_id, mi.menu_name FROM menu_items mi
     JOIN categories c ON c.category_id = mi.category_id
     WHERE c.category_name LIKE '%Unlimited%'`,
  );
  const packageCards = packageCardRows || [];
  const findPackageCard = (id) =>
    packageCards.find((card) => Number(card.item_id) === id);

  for (const id of packageItemIds) {
    const card = findPackageCard(id);
    if (card && inferPackageMode(card.menu_name) === mode) {
      packageCardItemId = id;
      break;
    }
  }

  if (packageCardItemId == null && reservationId) {
    const [existingCards] = await conn.execute(
      `SELECT mi.item_id, mi.menu_name
       FROM kiosk_orders ko
       JOIN menu_items mi ON mi.item_id = ko.item_id
       JOIN categories c ON c.category_id = mi.category_id
       WHERE ko.reservation_id = ? AND c.category_name LIKE '%Unlimited%'
       ORDER BY ko.created_at DESC`,
      [reservationId],
    );
    const existingCard = existingCards.find(
      (card) => inferPackageMode(card.menu_name) === mode,
    );
    if (existingCard) packageCardItemId = Number(existingCard.item_id);
  }

  const loadDbInclusions = async (pkgItemId) => {
    const [rows] = await conn.execute(
      `SELECT included_item_id, included_category_id, quantity_limit, is_unlimited
       FROM unlimited_package_inclusions WHERE package_item_id = ?`,
      [pkgItemId],
    );
    return rows;
  };

  try {
    if (packageCardItemId != null) {
      const rows = await loadDbInclusions(packageCardItemId);
      if (rows.length > 0) dbInclusions = rows;
    }
  } catch (err) {
    // Table may not exist yet — fall back to legacy rules.
    dbInclusions = null;
  }

  const validateWithDbInclusions = async () => {
    const limits = { byItem: new Map(), byCategory: new Map() };
    const categoryNames = new Map();
    const [catRows] = await conn.execute(`SELECT category_id, category_name FROM categories`);
    for (const cat of catRows || []) {
      categoryNames.set(Number(cat.category_id), String(cat.category_name || ""));
    }
    for (const inc of dbInclusions) {
      const unlimited = Number(inc.is_unlimited) === 1;
      const limit = unlimited ? Infinity : Math.max(1, Number(inc.quantity_limit) || 1);
      if (inc.included_item_id) {
        limits.byItem.set(Number(inc.included_item_id), limit);
      }
      if (inc.included_category_id) {
        const name = categoryNames.get(Number(inc.included_category_id)) || "";
        limits.byCategory.set(String(name).toLowerCase(), limit);
      }
    }

    const counts = { byItem: new Map(), byCategory: new Map() };
    const [existingRows] = await conn.execute(
      `SELECT ko.item_id, ko.quantity, mi.category_id, c.category_name
       FROM kiosk_orders ko
       JOIN menu_items mi ON mi.item_id = ko.item_id
       LEFT JOIN categories c ON c.category_id = mi.category_id
       WHERE ko.reservation_id = ?`,
      [reservationId],
    );
    for (const row of existingRows) {
      const itemId = Number(row.item_id);
      if (findPackageCard(itemId)) continue;
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) continue;
      const categoryKey = String(row.category_name || "").toLowerCase();
      if (limits.byItem.has(itemId)) {
        counts.byItem.set(itemId, (counts.byItem.get(itemId) || 0) + quantity);
      }
      if (limits.byCategory.has(categoryKey)) {
        counts.byCategory.set(
          categoryKey,
          (counts.byCategory.get(categoryKey) || 0) + quantity,
        );
      }
    }
    const packageIncludedItemIds = [];
    for (const orderItem of items) {
      const itemId = Number(orderItem.item_id || orderItem.id);
      const [menuRow] = await conn.execute(
        `SELECT mi.item_id, mi.menu_name, mi.category_id, c.category_name
         FROM menu_items mi LEFT JOIN categories c ON c.category_id = mi.category_id
         WHERE mi.item_id = ?`,
        [itemId],
      );
      if (!menuRow.length) {
        throw new Error("The order contains an invalid menu item.");
      }
      const menu = menuRow[0];
      const isPackageCard = findPackageCard(itemId) != null;
      if (isPackageCard) continue; // The package card itself carries the price.

      // A package-card-only order should not be rejected for missing drink
      // selection; the required drink is a package-level rule, not a per-item
      // requirement for the package card itself.
      if (
        String(menu.category_name || "").toLowerCase().includes("unlimited") &&
        !orderItem.is_refill &&
        !orderItem.is_package_included
      ) {
        continue;
      }

      const itemLimit = limits.byItem.get(itemId);
      const categoryKey = String(menu.category_name || "").toLowerCase();
      const categoryLimit = limits.byCategory.get(categoryKey);
      if (itemLimit === undefined && categoryLimit === undefined) {
        continue;
      }
      packageIncludedItemIds.push(itemId);
      const quantity = Number(orderItem.quantity);
      if (itemLimit !== undefined && Number.isFinite(itemLimit)) {
        const used = (counts.byItem.get(itemId) || 0) + quantity;
        if (used > itemLimit) {
          throw new Error(
            `The selected package allows a maximum of ${itemLimit} × "${menu.menu_name}".`,
          );
        }
        counts.byItem.set(itemId, used);
      }
      if (categoryLimit !== undefined && Number.isFinite(categoryLimit)) {
        const used = (counts.byCategory.get(categoryKey) || 0) + quantity;
        if (used > categoryLimit) {
          throw new Error(
            `The selected package allows a maximum of ${categoryLimit} item(s) from "${menu.category_name}".`,
          );
        }
        counts.byCategory.set(categoryKey, used);
      }
    }
    return {
      mode,
      packageCardItemId,
      packageIncludedItemIds,
    };
  };

  if (dbInclusions && dbInclusions.length > 0) {
    return await validateWithDbInclusions();
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("An order must contain at least one item.");
  }

  const requestedIds = [...new Set(items.map((item) => Number(item.item_id || item.id)))];
  if (requestedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("The order contains an invalid menu item.");
  }
  const placeholders = requestedIds.map(() => "?").join(",");
  const [requestedRows] = await conn.execute(
    `SELECT mi.item_id, mi.menu_name, c.category_name
     FROM menu_items mi
     LEFT JOIN categories c ON c.category_id = mi.category_id
     WHERE mi.item_id IN (${placeholders})`,
    requestedIds,
  );
  const requestedById = new Map(requestedRows.map((item) => [item.item_id, item]));

  const [flavorRows] = await conn.execute(
    `SELECT mi.menu_name, c.category_name
     FROM menu_items mi
     LEFT JOIN categories c ON c.category_id = mi.category_id
     WHERE c.category_name LIKE '%Chicken%' OR c.category_name LIKE '%Wing%'`,
  );
  const allowedFlavors = new Set(
    flavorRows
      .filter((item) => mode === "unlimited_wings_a" || isWingItem(item))
      .map((item) => String(item.menu_name).trim().toLowerCase()),
  );
  const [drinkRows] = await conn.execute(
    `SELECT mi.menu_name, c.category_name
     FROM menu_items mi
     LEFT JOIN categories c ON c.category_id = mi.category_id
     WHERE c.category_name LIKE '%Drink%' OR c.category_name LIKE '%Beverage%' OR c.category_name LIKE '%Juice%'`,
  );
  const allowedDrinks = new Set(
    drinkRows
      .filter((item) => mode === "unlimited_wings_a" || isJuice(item))
      .map((item) => String(item.menu_name).trim().toLowerCase()),
  );

  const packageIncludedItemIds = [];
  for (const orderItem of items) {
    const itemId = Number(orderItem.item_id || orderItem.id);
    const menuItem = requestedById.get(itemId);
    const quantity = Number(orderItem.quantity);
    if (!menuItem) throw new Error("The order contains an invalid menu item.");
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Order item quantities must be positive whole numbers.");
    }
    if (!isIncluded(menuItem, mode)) continue;
    packageIncludedItemIds.push(itemId);
    const flavors = getSelectedFlavors(orderItem.customizations);
    if (flavors.some((flavor) => !allowedFlavors.has(String(flavor).toLowerCase()))) {
      throw new Error("The order contains a flavor outside the selected package.");
    }
    const drink = getSelectedDrink(orderItem.customizations);
    const hasSeparateDrink = items.some((candidate) => {
      if (candidate === orderItem) return false;
      const candidateId = Number(candidate.item_id || candidate.id);
      const candidateMenu = requestedById.get(candidateId);
      return (
        isDrinkCategory(candidateMenu?.category_name) &&
        (mode === "unlimited_wings_a" || isJuice(candidateMenu))
      );
    });
    if (
      String(menuItem.category_name || "").toLowerCase().includes("unlimited") &&
      !findPackageCard(itemId) &&
      !drink &&
      !hasSeparateDrink &&
      !orderItem.is_refill &&
      !orderItem.is_package_included
    ) {
      throw new Error("Select one included drink for the Unlimited Menu package.");
    }
    if (drink && !allowedDrinks.has(drink.toLowerCase())) {
      throw new Error("The selected drink is outside the selected package.");
    }
  }

  const [existingRows] = await conn.execute(
    `SELECT ko.item_id, ko.quantity, ko.customizations, mi.menu_name,
            c.category_name
     FROM kiosk_orders ko
     JOIN menu_items mi ON mi.item_id = ko.item_id
     LEFT JOIN categories c ON c.category_id = mi.category_id
     WHERE ko.reservation_id = ?`,
    [reservationId],
  );
  const existingPackageRows = existingRows.filter((row) =>
    isIncluded(row, mode),
  );
  for (const row of existingPackageRows) {
    const flavors = getSelectedFlavors(row.customizations);
    if (flavors.some((flavor) => !allowedFlavors.has(String(flavor).toLowerCase()))) {
      throw new Error("The existing order contains a flavor outside the selected package.");
    }
    const drink = getSelectedDrink(row.customizations);
    if (drink && !allowedDrinks.has(drink.toLowerCase())) {
      throw new Error("The existing order contains a drink outside the selected package.");
    }
  }

  if (mode === "unlimited_wings_a") {
    const existingChicken = existingPackageRows.reduce((total, row) => {
      if (isChickenCategory(row.category_name)) return total + Number(row.quantity || 0);
      return total + getSelectedFlavors(row.customizations).length * Number(row.quantity || 1);
    }, 0);
    const newChicken = items.reduce((total, row) => {
      const itemId = Number(row.item_id || row.id);
      if (!packageIncludedItemIds.includes(itemId)) return total;
      const menuItem = requestedById.get(itemId);
      if (isChickenCategory(menuItem.category_name)) return total + Number(row.quantity);
      return total + getSelectedFlavors(row.customizations).length * Number(row.quantity);
    }, 0);
    const existingDrinks = existingPackageRows.reduce((total, row) => {
      if (isDrinkCategory(row.category_name)) return total + Number(row.quantity || 0);
      return total + (getSelectedDrink(row.customizations) ? Number(row.quantity || 1) : 0);
    }, 0);
    const newDrinks = items.reduce((total, row) => {
      const itemId = Number(row.item_id || row.id);
      if (!packageIncludedItemIds.includes(itemId)) return total;
      const menuItem = requestedById.get(itemId);
      if (isDrinkCategory(menuItem.category_name)) return total + Number(row.quantity);
      return total + (getSelectedDrink(row.customizations) ? Number(row.quantity) : 0);
    }, 0);

    if (existingChicken + newChicken > 6) {
      throw new Error("Unlimited Menu A allows a maximum of 6 chicken pieces.");
    }
    if (existingDrinks + newDrinks > 1) {
      throw new Error("Unlimited Menu A allows only 1 drink.");
    }
  }

  return {
    mode,
    packageCardItemId,
    packageIncludedItemIds,
  };
};

module.exports = { validateUnlimitedPackageOrder };