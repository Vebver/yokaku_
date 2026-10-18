const db = require("../config/db");

const migrate = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_takeout_requests (
      takeout_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reservation_id VARCHAR(20) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'requested',
      requested_by INT NULL,
      request_key VARCHAR(80) NULL,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (takeout_id),
      KEY idx_event_takeout_reservation_status (reservation_id, status),
      UNIQUE KEY uq_event_takeout_request_key (reservation_id, request_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  const [requestKeyColumn] = await db.query(
    "SHOW COLUMNS FROM event_takeout_requests LIKE 'request_key'",
  );
  if (requestKeyColumn.length === 0) {
    await db.query(
      "ALTER TABLE event_takeout_requests ADD COLUMN request_key VARCHAR(80) NULL",
    );
  }

  const [requestKeyIndex] = await db.query(
    "SHOW INDEX FROM event_takeout_requests WHERE Key_name = 'uq_event_takeout_request_key'",
  );
  if (requestKeyIndex.length === 0) {
    await db.query(
      "ALTER TABLE event_takeout_requests ADD UNIQUE KEY uq_event_takeout_request_key (reservation_id, request_key)",
    );
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_takeout_items (
      takeout_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      takeout_id BIGINT UNSIGNED NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT UNSIGNED NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      PRIMARY KEY (takeout_item_id),
      KEY idx_event_takeout_items_request (takeout_id),
      KEY idx_event_takeout_items_menu_item (menu_item_id),
      CONSTRAINT fk_event_takeout_items_request
        FOREIGN KEY (takeout_id) REFERENCES event_takeout_requests(takeout_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  const [unitPriceColumn] = await db.query(
    "SHOW COLUMNS FROM event_takeout_items LIKE 'unit_price'",
  );
  if (unitPriceColumn.length === 0) {
    await db.query(
      "ALTER TABLE event_takeout_items ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00",
    );
    await db.query(`
      UPDATE event_takeout_items takeout_item
      JOIN menu_items menu_item ON menu_item.item_id = takeout_item.menu_item_id
      SET takeout_item.unit_price = menu_item.price
      WHERE takeout_item.unit_price = 0 AND menu_item.price > 0
    `);
  }

  console.log("Event takeout tables are ready.");
};

migrate()
  .catch((error) => {
    console.error("Event takeout migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
