export const parseKioskVisibleCategoryIds = (value) => {
  if (value == null || value === "") return null;

  const categoryIds = typeof value === "string" ? JSON.parse(value) : value;
  if (
    !Array.isArray(categoryIds) ||
    categoryIds.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1)
  ) {
    throw new Error("Kiosk category visibility settings are invalid.");
  }

  return new Set(categoryIds.map(String));
};

export const isKioskCategoryVisible = (categoryName, menuData, visibleIds) => {
  if (visibleIds === null) return true;

  const categoryId = menuData[categoryName]?.[0]?.category_id;
  return categoryId != null && visibleIds.has(String(categoryId));
};
