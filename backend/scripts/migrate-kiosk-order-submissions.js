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
      UNIQUE KEY uq_kiosk_order_submission (reservation_id, idempotency_key),
      CONSTRAINT fk_kiosk_submission_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations (reservation_id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  // --- Sample data (idempotent: ignored if the rows already exist) ---
  await db.query(`
    INSERT IGNORE INTO kiosk_order_submissions
      (reservation_id, idempotency_key, payload_hash, response_json)
    VALUES
      ('RES-389C4X',
       'key-res-389c4x-order-001',
       '3f79bb7b435b05321651daefd374cdc681dc06faa65e374789b16d2cf9f0e1f9',
       JSON_OBJECT('order_id', 101, 'status', 'pending', 'duplicate', false)),

      ('WALK-1780246881142',
       'key-walk-1780246881142-order-001',
       '2c26b46b68ffc68ff99b453c1d30413413422d706483bfaedf98b7d4c0d1e3c5',
       JSON_OBJECT('order_id', 402, 'status', 'pending', 'duplicate', false)),

      ('WALK-1780246881142',
       'key-walk-1780246881142-order-002',
       '9d2e4c1f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d',
       NULL)
  `);

  // --- Add FK to an already-existing table (CREATE IF NOT EXISTS won't apply it) ---
  // 1) Remove orphan rows that would block the constraint.
  await db.query(`
    DELETE k FROM kiosk_order_submissions k
    LEFT JOIN reservations r ON r.reservation_id = k.reservation_id
    WHERE r.reservation_id IS NULL
  `);

  // 2) Add the constraint only if it isn't already present.
  const [[{ fkCount }]] = await db.query(`
    SELECT COUNT(*) AS fkCount
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'kiosk_order_submissions'
      AND CONSTRAINT_NAME = 'fk_kiosk_submission_reservation'
  `);

  if (Number(fkCount) === 0) {
    await db.query(`
      ALTER TABLE kiosk_order_submissions
        ADD CONSTRAINT fk_kiosk_submission_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations (reservation_id)
        ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log("Foreign key fk_kiosk_submission_reservation added.");
  } else {
    console.log("Foreign key fk_kiosk_submission_reservation already exists.");
  }

  console.log("Kiosk order idempotency table is ready (with sample data).");
};

migrate()
  .catch((error) => {
    console.error("Kiosk order idempotency migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());