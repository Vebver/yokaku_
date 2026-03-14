const mysql = require('mysql2/promise');
const config = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedDB() {
  const connection = await mysql.createConnection(config);
  
  try {
    // Seed users (admin)
    const hashed = await bcrypt.hash('admin123', 12);
    await connection.execute(`
      INSERT IGNORE INTO users (name, email, password_hash, role) 
      VALUES ('Admin', 'admin@yokaku.com', ?, 'admin')
    `, [hashed]);

    // Seed menu_items
    await connection.execute(`
      INSERT IGNORE INTO menu_items (name, description, price, category) VALUES
      ('Margherita Pizza', 'Classic cheese pizza', 12.99, 'Pizza'),
      ('Ramen Bowl', 'Spicy ramen noodles', 14.50, 'Noodles'),
      ('Chicken Wings', 'Spicy buffalo wings', 8.99, 'Appetizers')
    `);

    // Seed inventory
    await connection.execute(`
      INSERT IGNORE INTO inventory (item_name, quantity, unit, reorder_level) VALUES
      ('Tomato Sauce', 100, 'liters', 20),
      ('Chicken', 50, 'kg', 10),
      ('Noodles', 200, 'packs', 30)
    `);

    // Seed tables
    await connection.execute(`
      INSERT IGNORE INTO tables (table_number, capacity, status) VALUES
      (1, 4, 'available'),
      (2, 6, 'available'),
      (3, 4, 'occupied')
    `);

    console.log('✅ DB seeded: users, menu_items, inventory, tables');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    connection.end();
  }
}

seedDB();

