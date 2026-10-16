const PACKAGE_RULES = {
  unlimited_wings_a: {
    label: "Unlimited Menu A",
    included: "Unlimited Rice · Chicken (up to 6 pieces) · 1 drink",
    chickenLimit: 6,
    drinkLimit: 1,
    juiceOnly: false,
  },
  unlimited_wings_b: {
    label: "Unlimited Menu B",
    included: "Unlimited Wings · Unlimited Rice · Juice",
    chickenLimit: Infinity,
    drinkLimit: Infinity,
    juiceOnly: true,
  },
  unlimited_wings_c: {
    label: "Unlimited Menu C",
    included: "Wings · Pasta · Fries · Nachos · Juice",
    chickenLimit: Infinity,
    drinkLimit: Infinity,
    juiceOnly: true,
  },
};

const getName = (item) =>
  String(item?.name || item?.menu_name || item?.item_name || "").toLowerCase();

const getCategory = (item) => {
  const category = String(item?.category || item?.category_name || "").toLowerCase();
  if (category) return category;

  const name = getName(item);
  if (name.includes("unlimited")) return "unlimited";
  if (/juice|lemonade|orange|calamansi|iced tea|water/.test(name)) return "drinks";
  if (/chicken|wing/.test(name)) return "chicken";
  if (name.includes("pasta")) return "pasta";
  if (/fries|nachos/.test(name)) return "fries and nachos";
  return "";
};

export const getUnlimitedPackage = (mode) => PACKAGE_RULES[mode] || null;

export const inferUnlimitedPackageMode = (value) => {
  const name =
    typeof value === "string" ? value.toLowerCase() : getName(value);
  if (!name.includes("unlimited")) return null;
  if (/\bc\b/.test(name)) return "unlimited_wings_c";
  if (/\bb\b/.test(name)) return "unlimited_wings_b";
  return "unlimited_wings_a";
};

export const isUnlimitedPackageItem = (item) =>
  getCategory(item).includes("unlimited") || getName(item).includes("unlimited");

export const isPackageCardForMode = (item, mode) => {
  if (!isUnlimitedPackageItem(item)) return false;
  const name = getName(item);
  if (mode === "unlimited_wings_a") return !/\b(?:b|c)\b/.test(name);
  if (mode === "unlimited_wings_b") return /\bb\b/.test(name);
  if (mode === "unlimited_wings_c") return /\bc\b/.test(name);
  return false;
};

export const isJuiceItem = (item) =>
  /juice|lemonade|orange|calamansi|iced tea/.test(getName(item)) ||
  getCategory(item).includes("juice");

const isChickenCategory = (category) =>
  category.includes("chicken") || category.includes("wing");

const isWingItem = (item, category) =>
  category.includes("chicken wings") || /wing/i.test(getName(item));

const isRiceItem = (item) =>
  /^(?:unlimited\s+)?(?:steamed\s+)?rice$/i.test(getName(item).trim());

const parseCustomizations = (value) => {
  if (typeof value !== "string") return value || "";
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const hasSelectedDrink = (value) => {
  const customizations = parseCustomizations(value);
  return Boolean(
    customizations?.drink || /\bdrink\s*:/i.test(String(customizations)),
  );
};

const getFlavorCount = (value) => {
  const customizations = parseCustomizations(value);
  if (Array.isArray(customizations?.flavors)) return customizations.flavors.length;
  return (
    String(customizations).match(/flavors\s*:\s*([^|]+)/i)?.[1]
      .split(",")
      .filter(Boolean).length || 0
  );
};

const isNonFoodCharge = (item) => {
  const name = getName(item);
  const customizations = String(item?.customizations || "").toLowerCase();
  return (
    item?.line_type === "downpayment" ||
    customizations.includes("reservation fee") ||
    name.includes("reservation fee") ||
    name.includes("downpayment") ||
    name.includes("table fee")
  );
};

export const getPackageChickenCount = (cart, mode) => {
  if (mode !== "unlimited_wings_a") return 0;
  return (cart || []).reduce((total, item) => {
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    if (isChickenCategory(getCategory(item))) return total + quantity;
    if (isPackageCardForMode(item, mode)) {
      const customizations = item.customizations || "";
      return total + getFlavorCount(customizations) * quantity;
    }
    return total;
  }, 0);
};

export const getPackageDrinkCount = (cart, mode) => {
  if (mode !== "unlimited_wings_a") return 0;
  return (cart || []).reduce((total, item) => {
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    const customizations = item.customizations || "";
    if (isDrinkCategory(getCategory(item))) return total + quantity;
    return total + (hasSelectedDrink(customizations) ? quantity : 0);
  }, 0);
};

export const getPackageQuantityLimit = (cart, item, mode) => {
  if (mode !== "unlimited_wings_a") return Infinity;
  const category = getCategory(item);
  if (isChickenCategory(category)) {
    return Math.max(0, 6 - getPackageChickenCount(cart, mode));
  }
  if (isDrinkCategory(category)) {
    return Math.max(0, 1 - getPackageDrinkCount(cart, mode));
  }
  if (isPackageCardForMode(item, mode)) {
    const existing = (cart || []).reduce(
      (total, cartItem) =>
        total +
        (isPackageCardForMode(cartItem, mode)
          ? Number.parseInt(cartItem.quantity, 10) || 1
          : 0),
      0,
    );
    return Math.max(0, 1 - existing);
  }
  return Infinity;
};

const isDrinkCategory = (category) =>
  category.includes("drink") ||
  category.includes("beverage") ||
  category.includes("juice");

export const isItemIncludedInPackage = (item, mode) => {
  const rules = getUnlimitedPackage(mode);
  if (!rules) return true;

  const category = getCategory(item);
  if (isPackageCardForMode(item, mode)) return true;
  if (isUnlimitedPackageItem(item)) return false;
  if (isChickenCategory(category)) {
    return mode === "unlimited_wings_a" || isWingItem(item, category);
  }
  if (isDrinkCategory(category)) return !rules.juiceOnly || isJuiceItem(item);
  if (
    (mode === "unlimited_wings_a" || mode === "unlimited_wings_b") &&
    isRiceItem(item)
  ) {
    return true;
  }
  if (mode === "unlimited_wings_c") {
    const name = getName(item);
    return (
      category.includes("pasta") ||
      ((category.includes("fries") || category.includes("nachos")) &&
        /fries|nachos/.test(name) &&
        !/fish/i.test(name))
    );
  }
  return false;
};

export const getPackageCategories = (menuData, mode) =>
  Object.keys(menuData || {}).filter((category) =>
    (menuData[category] || []).some((item) =>
      isItemIncludedInPackage({ ...item, category }, mode),
    ),
  );

export const getDrinkOptions = (menuData) =>
  Object.entries(menuData || {})
    .filter(([category]) => /drink|beverage|juice/i.test(category))
    .flatMap(([, items]) => items || []);

export const getPackageMenuData = (menuData, mode) =>
  Object.fromEntries(
    Object.entries(menuData || {})
      .map(([category, items]) => [
        category,
        getPackageItems(items, category, mode),
      ])
      .filter(([, items]) => items.length > 0),
  );

export const getPackageItems = (items, category, mode) =>
  (items || []).filter((item) =>
    isItemIncludedInPackage({ ...item, category }, mode),
  );

export const sanitizePackageCart = (cart, mode) => {
  const rules = getUnlimitedPackage(mode);
  if (!rules) return cart;

  let chickenCount = 0;
  let drinkCount = 0;
  return (cart || []).reduce((validItems, item) => {
    if (!isItemIncludedInPackage(item, mode)) return validItems;

    const category = getCategory(item);
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    const isChicken = isChickenCategory(category);
    const isDrink = isDrinkCategory(category);
    const isPackageCard = isPackageCardForMode(item, mode);
    const customizations = item.customizations || "";
    const flavorCount = getFlavorCount(customizations);
    const customDrink = hasSelectedDrink(customizations);
    let allowedQuantity = quantity;

    if (isChicken && Number.isFinite(rules.chickenLimit)) {
      allowedQuantity = Math.min(quantity, rules.chickenLimit - chickenCount);
      chickenCount += Math.max(0, allowedQuantity);
    }
    if (isPackageCard && Number.isFinite(rules.chickenLimit)) {
      chickenCount += flavorCount * quantity;
    }
    if ((isDrink || customDrink) && Number.isFinite(rules.drinkLimit)) {
      allowedQuantity = Math.min(allowedQuantity, rules.drinkLimit - drinkCount);
      drinkCount += Math.max(0, allowedQuantity);
    }

    if (allowedQuantity > 0) {
      validItems.push({ ...item, quantity: allowedQuantity });
    }
    return validItems;
  }, []);
};

export const validatePackageCart = (cart, mode) => {
  const rules = getUnlimitedPackage(mode);
  if (!rules) return null;

  const foodItems = (cart || []).filter((item) => !isNonFoodCharge(item));
  const sanitized = sanitizePackageCart(foodItems, mode);
  if (Number.isFinite(rules.chickenLimit)) {
    const chickenCount = getPackageChickenCount(foodItems, mode);
    if (chickenCount > rules.chickenLimit) {
      return `Unlimited Menu A allows a maximum of ${rules.chickenLimit} chicken pieces.`;
    }
  }
  if (Number.isFinite(rules.drinkLimit)) {
    const drinkCount = getPackageDrinkCount(foodItems, mode);
    if (drinkCount > rules.drinkLimit) {
      return `Unlimited Menu A allows only ${rules.drinkLimit} drink.`;
    }
  }
  if (sanitized.length !== foodItems.length) {
    return "Your order contains items outside the selected package. Remove them before checkout.";
  }
  if (
    sanitized.some(
      (item, index) => item.quantity !== foodItems[index]?.quantity,
    )
  ) {
    return `Your order exceeds the limits for ${rules.label}.`;
  }
  return null;
};