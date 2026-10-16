const db = require("../config/db");

const migrate = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_takeout_requests (
      takeout_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reservation_id VARCHAR(20) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'requested',
      requested_by INT NULL,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (takeout_id),
      KEY idx_event_takeout_reservation_status (reservation_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_takeout_items (
      takeout_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      takeout_id BIGINT UNSIGNED NOT NULL,
      menu_item_id INT NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      PRIMARY KEY (takeout_item_id),
      KEY idx_event_takeout_items_request (takeout_id),
      KEY idx_event_takeout_items_menu_item (menu_item_id),
      CONSTRAINT fk_event_takeout_items_request
        FOREIGN KEY (takeout_id) REFERENCES event_takeout_requests(takeout_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  console.log("Event takeout tables are ready.");
};

migrate()
  .catch((error) => {
    console.error("Event takeout migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
