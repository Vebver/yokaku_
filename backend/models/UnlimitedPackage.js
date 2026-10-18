const db = require("../config/db");

// Dynamic inclusions for Unlimited Menu packages. Each Unlimited menu item
// (a row in menu_items under the "Unlimited" category) can declare which
// categories or individual menu items are included in the package, and with
// what quantity limit (NULL / unlimited flag = no limit).
// Created lazily on first use, matching the Inventory/Product model pattern.
let ensurePromise = null;
const ensureTable = async () => {
  if (!ensurePromise) {
    ensurePromise = db
      .query(
        `
        CREATE TABLE IF NOT EXISTS unlimited_package_inclusions (
          inclusion_id INT NOT NULL AUTO_INCREMENT,
          package_item_id INT NOT NULL,
          included_item_id INT DEFAULT NULL,
          included_category_id INT DEFAULT NULL,
          quantity_limit INT DEFAULT NULL,
          is_unlimited TINYINT NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (inclusion_id),
          KEY pkg_idx (package_item_id),
          KEY incl_item_idx (included_item_id),
          KEY incl_cat_idx (included_category_id)
        )
      `,
      )
      .catch((err) => {
        ensurePromise = null;
        throw err;
      });
  }
  return ensurePromise;
};

const UnlimitedPackage = {
  ensureTable,

  // All inclusions grouped by the package menu item id.
  getAll: async () => {
    await ensureTable();
    const [rows] = await db.query(
      `SELECT inclusion_id, package_item_id, included_item_id,
              included_category_id, quantity_limit, is_unlimited
       FROM unlimited_package_inclusions
       ORDER BY inclusion_id ASC`,
    );
    return rows;
  },

  getForPackageItem: async (packageItemId) => {
    await ensureTable();
    const [rows] = await db.query(
      `SELECT inclusion_id, package_item_id, included_item_id,
              included_category_id, quantity_limit, is_unlimited
       FROM unlimited_package_inclusions
       WHERE package_item_id = ?
       ORDER BY inclusion_id ASC`,
      [packageItemId],
    );
    return rows;
  },

  // Replace the whole inclusion set for one package item.
  replace: async (packageItemId, inclusions) => {
    await ensureTable();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "DELETE FROM unlimited_package_inclusions WHERE package_item_id = ?",
        [packageItemId],
      );
      for (const inc of inclusions || []) {
        const itemId = Number.parseInt(inc.included_item_id, 10) || null;
        const categoryId =
          Number.parseInt(inc.included_category_id, 10) || null;
        if (!itemId && !categoryId) continue;
        const unlimited =
          inc.is_unlimited === true ||
          inc.is_unlimited === 1 ||
          inc.quantity_limit === null ||
          inc.quantity_limit === undefined ||
          inc.quantity_limit === "";
        await connection.execute(
          `INSERT INTO unlimited_package_inclusions
             (package_item_id, included_item_id, included_category_id,
              quantity_limit, is_unlimited)
           VALUES (?, ?, ?, ?, ?)`,
          [
            packageItemId,
            itemId,
            categoryId,
            unlimited
              ? null
              : Math.max(1, Number.parseInt(inc.quantity_limit, 10) || 1),
            unlimited ? 1 : 0,
          ],
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  deleteForPackageItem: async (packageItemId) => {
    await ensureTable();
    await db.execute(
      "DELETE FROM unlimited_package_inclusions WHERE package_item_id = ?",
      [packageItemId],
    );
  },
};

module.exports = UnlimitedPackage;
