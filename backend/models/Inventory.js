const db = require('../config/db');

const Inventory = {
    // GET ALL ITEMS
    getAll: async () => {
        // We sort by last_updated so the newest changes appear first
        const [rows] = await db.query('SELECT * FROM inventory ORDER BY last_updated DESC');
        return rows;
    },

    // CREATE NEW ITEM
    create: async (data) => {
        // 1. These must be the EXACT column names from your MySQL table
        const sql = `INSERT INTO inventory 
            (item_name, category, quantity, unit, unit_price, expiry_date, supplier, storage_location, reorder_level) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // 2. These must match the names sent from your React 'newItem' state
        const values = [
            data.item_name,
            data.category,
            data.quantity,
            data.unit,
            data.unit_price,
            data.expiry_date,
            data.supplier,
            data.storage_location,
            data.reorder_level
        ];

        const [result] = await db.execute(sql, values);
        return { inventory_id: result.insertId, ...data };
    },

    // DELETE ITEM
    delete: async (id) => {
        const sql = 'DELETE FROM inventory WHERE inventory_id = ?';
        await db.execute(sql, [id]);
        return true;
    }
};

module.exports = Inventory;