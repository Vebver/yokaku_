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

const EMPTY_PACKAGE_INCLUSIONS = [];

const getName = (item) =>
  String(item?.name || item?.menu_name || item?.item_name || "").toLowerCase();

export const getCategory = (item) => {
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
  if (/\bset\b/.test(name)) return null;
  const hasUnlimitedCategory =
    typeof value !== "string" && getCategory(value).includes("unlimited");
  if (!name.includes("unlimited") && !hasUnlimitedCategory) return null;
  if (/\bc\b/.test(name)) return "unlimited_wings_c";
  if (/\bb\b/.test(name)) return "unlimited_wings_b";
  return "unlimited_wings_a";
};

export const isUnlimitedPackageItem = (item) =>
  !/\bset\b/.test(getName(item)) &&
  (getCategory(item).includes("unlimited") || getName(item).includes("unlimited"));

export const isSetItem = (item) => /\bset\b/.test(getName(item));

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

export const isChickenCategory = (category) =>
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

export const hasUnlimitedFlavorSelection = (items) =>
  (items || []).some(
    (item) =>
      getFlavorCount(item.customizations) > 0 ||
      (!isUnlimitedPackageItem(item) && isChickenCategory(getCategory(item))),
  );

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

export const getPackageInclusions = (menuData, mode, packageItem) => {
  const menuItems = Object.values(menuData || {}).flat();
  const packageItemId = packageItem?.item_id ?? packageItem?.id;
  const packageCard = packageItem
    ? menuItems.find(
        (item) =>
          packageItemId != null &&
          String(item.id ?? item.item_id) === String(packageItemId),
      ) || packageItem
    : menuItems.find((item) => isPackageCardForMode(item, mode));
  return packageCard?.package_inclusions || EMPTY_PACKAGE_INCLUSIONS;
};

export const getPackageInclusionSummary = (menuData, packageInclusions) => {
  const menuItems = Object.values(menuData || {}).flat();
  return (packageInclusions || [])
    .map((inclusion) => {
      const includedItem = menuItems.find(
        (item) =>
          inclusion.included_item_id != null &&
          Number(item.id ?? item.item_id) === Number(inclusion.included_item_id),
      );
      const includedCategory = Object.entries(menuData || {}).find(([, items]) =>
        items.some(
          (item) =>
            inclusion.included_category_id != null &&
            Number(item.category_id) === Number(inclusion.included_category_id),
        ),
      )?.[0];
      const label = includedItem?.name || includedItem?.menu_name || includedCategory;
      if (!label) return null;
      const limit =
        inclusion.is_unlimited || inclusion.quantity_limit == null
          ? "Unlimited"
          : `up to ${inclusion.quantity_limit}`;
      return `${label} (${limit})`;
    })
    .filter(Boolean)
    .join(" · ");
};

const matchesInclusion = (item, inclusion) =>
  (inclusion.included_item_id != null &&
    Number(item?.id || item?.item_id) === Number(inclusion.included_item_id)) ||
  (inclusion.included_category_id != null &&
    Number(item?.category_id) === Number(inclusion.included_category_id));

export const getUnlimitedPackageRefillItems = (menuData, packageInclusions) => {
  const unlimitedInclusions = (packageInclusions || []).filter(
    (inclusion) =>
      inclusion.is_unlimited || inclusion.quantity_limit == null,
  );
  if (unlimitedInclusions.length === 0) return [];
  return Object.values(menuData || {})
    .flat()
    .filter(
      (item) =>
        !isUnlimitedPackageItem(item) &&
        unlimitedInclusions.some((inclusion) =>
          matchesInclusion(item, inclusion),
        ),
    );
};

const inclusionLimit = (inclusion) =>
  inclusion.is_unlimited || inclusion.quantity_limit == null
    ? Infinity
    : Math.max(1, Number(inclusion.quantity_limit) || 1);

export const getPackageQuantityLimit = (
  cart,
  item,
  mode,
  packageInclusions = [],
) => {
  if (packageInclusions.length > 0) {
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
    const matchingInclusions = packageInclusions
      .map((inclusion, index) => ({ inclusion, index }))
      .filter(({ inclusion }) => matchesInclusion(item, inclusion));
    if (matchingInclusions.length === 0) return 0;
    return Math.max(
      0,
      Math.min(
        ...matchingInclusions.map(({ inclusion, index }) => {
          const used = (cart || []).reduce(
            (total, cartItem) =>
              total +
              (matchesInclusion(cartItem, inclusion) &&
              (mode !== "set" ||
                cartItem.is_set_included ||
                String(cartItem.customizations || "").includes(
                  "[PACKAGE INCLUDED]",
                ))
                ? Number.parseInt(cartItem.quantity, 10) || 1
                : 0),
            0,
          );
          return inclusionLimit(inclusion) - used;
        }),
      ),
    );
  }
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

export const isItemIncludedInPackage = (item, mode, packageInclusions = []) => {
  if (isPackageCardForMode(item, mode)) return true;
  if (packageInclusions.length > 0) {
    return packageInclusions.some((inclusion) =>
      matchesInclusion(item, inclusion),
    );
  }

  const rules = getUnlimitedPackage(mode);
  if (!rules) return true;
  const category = getCategory(item);
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

export const getPackageCategories = (menuData, mode, packageInclusions = []) =>
  Object.keys(menuData || {}).filter(
    (category) =>
      !category.toLowerCase().includes("unlimited") &&
      (menuData[category] || []).some((item) =>
        isItemIncludedInPackage(
          { ...item, category },
          mode,
          packageInclusions,
        ),
      ),
  );

export const getDrinkOptions = (menuData) =>
  Object.entries(menuData || {})
    .filter(([category]) => /drink|beverage|juice/i.test(category))
    .flatMap(([, items]) => items || []);

export const getPackageMenuData = (menuData, mode, packageInclusions = []) =>
  Object.fromEntries(
    Object.entries(menuData || {})
      .filter(([category]) => !category.toLowerCase().includes("unlimited"))
      .map(([category, items]) => [
        category,
        getPackageItems(items, category, mode, packageInclusions),
      ])
      .filter(([, items]) => items.length > 0),
  );

export const getPackageItems = (items, category, mode, packageInclusions = []) =>
  !String(category || "").toLowerCase().includes("unlimited")
    ? (items || []).filter(
        (item) =>
          !isPackageCardForMode(item, mode) &&
          !isSetItem(item) &&
          isItemIncludedInPackage(
            { ...item, category },
            mode,
            packageInclusions,
          ),
      )
    : [];

export const sanitizePackageCart = (cart, mode, packageInclusions = []) => {
  const rules = getUnlimitedPackage(mode);
  if (!rules) return cart;

  if (packageInclusions.length > 0) {
    const counts = new Map();
    return (cart || []).reduce((validItems, item) => {
      if (!isItemIncludedInPackage(item, mode, packageInclusions)) {
        return validItems;
      }
      const matchingInclusions = packageInclusions
        .map((inclusion, index) => ({ inclusion, index }))
        .filter(({ inclusion }) => matchesInclusion(item, inclusion));
      const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
      const allowedQuantity = matchingInclusions.reduce(
        (allowed, { inclusion, index }) =>
          Math.min(
            allowed,
            inclusionLimit(inclusion) - (counts.get(index) || 0),
          ),
        quantity,
      );
      if (allowedQuantity > 0) {
        validItems.push({ ...item, quantity: allowedQuantity });
        for (const { index } of matchingInclusions) {
          counts.set(index, (counts.get(index) || 0) + allowedQuantity);
        }
      }
      return validItems;
    }, []);
  }

  let chickenCount = 0;
  let drinkCount = 0;
  return (cart || []).reduce((validItems, item) => {
    if (!isItemIncludedInPackage(item, mode, packageInclusions)) return validItems;

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

export const validatePackageCart = (cart, mode, packageInclusions = []) => {
  const rules = getUnlimitedPackage(mode);
  if (!rules && packageInclusions.length === 0) return null;

  const foodItems = (cart || []).filter((item) => !isNonFoodCharge(item));
  const packageItems = foodItems.filter((item) =>
    isItemIncludedInPackage(item, mode, packageInclusions) &&
    (!isSetItem(item) || item.is_set_included),
  );
  const sanitized = sanitizePackageCart(packageItems, mode, packageInclusions);
  if (packageInclusions.length > 0) {
    if (sanitized.length !== packageItems.length) {
      return "Your order contains items outside the selected package. Remove them before checkout.";
    }
    if (
      sanitized.some(
        (item, index) => item.quantity !== packageItems[index]?.quantity,
      )
    ) {
      return `Your order exceeds the limits for ${rules?.label || "this set"}.`;
    }
    return null;
  }
  if (Number.isFinite(rules.chickenLimit)) {
    const chickenCount = getPackageChickenCount(packageItems, mode);
    if (chickenCount > rules.chickenLimit) {
      return `Unlimited Menu A allows a maximum of ${rules.chickenLimit} chicken pieces.`;
    }
  }
  if (Number.isFinite(rules.drinkLimit)) {
    const drinkCount = getPackageDrinkCount(packageItems, mode);
    if (drinkCount > rules.drinkLimit) {
      return `Unlimited Menu A allows only ${rules.drinkLimit} drink.`;
    }
  }
  if (sanitized.length !== packageItems.length) {
    return "Your order contains items outside the selected package. Remove them before checkout.";
  }
  if (
    sanitized.some(
        (item, index) => item.quantity !== packageItems[index]?.quantity,
    )
  ) {
    return `Your order exceeds the limits for ${rules.label}.`;
  }
  return null;
};