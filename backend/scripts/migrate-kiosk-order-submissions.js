const db = require("../config/db");

const migrate = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS kiosk_order_submissions (
      submission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reservation_id VARCHAR(20) NOT NULL,
      idempotency_key VARCHAR(80) NOT NULL,
      payload_hash CHAR(64) NOT NULL,
      response_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (submission_id),
      UNIQUE KEY uq_kiosk_order_submission (reservation_id, idempotency_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  console.log("Kiosk order idempotency table is ready.");
};

migrate()
  .catch((error) => {
    console.error("Kiosk order idempotency migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());