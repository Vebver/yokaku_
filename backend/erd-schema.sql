-- Auto-generated schema dump for ERD

CREATE TABLE "announcements" (
  "announcement_id" int NOT NULL AUTO_INCREMENT,
  "title" varchar(180) NOT NULL,
  "description" text NOT NULL,
  "announcement_type" varchar(30) NOT NULL DEFAULT 'update',
  "image_url" varchar(2048) DEFAULT NULL,
  "local_path" varchar(2048) DEFAULT NULL,
  "is_published" tinyint(1) NOT NULL DEFAULT '0',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("announcement_id"),
  KEY "idx_announcements_published" ("is_published","created_at")
);

CREATE TABLE "audit_logs" (
  "log_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int DEFAULT NULL,
  "action" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "target_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "details" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("log_id"),
  KEY "user_id" ("user_id"),
  CONSTRAINT "audit_logs_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL
);

CREATE TABLE "barangays" (
  "brgy_code" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "brgy_name" varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "muni_code" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY ("brgy_code"),
  KEY "muni_code" ("muni_code"),
  CONSTRAINT "barangays_ibfk_1" FOREIGN KEY ("muni_code") REFERENCES "municipalities" ("muni_code")
);

CREATE TABLE "blocked_dates" (
  "id" int NOT NULL AUTO_INCREMENT,
  "block_date" date NOT NULL,
  "reason" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "block_date" ("block_date")
);

CREATE TABLE "categories" (
  "category_id" int NOT NULL AUTO_INCREMENT,
  "category_name" varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "description" varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY ("category_id")
);

CREATE TABLE "event_takeout_items" (
  "takeout_item_id" bigint unsigned NOT NULL AUTO_INCREMENT,
  "takeout_id" bigint unsigned NOT NULL,
  "menu_item_id" int NOT NULL,
  "quantity" int unsigned NOT NULL,
  "unit_price" decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY ("takeout_item_id"),
  KEY "idx_event_takeout_items_request" ("takeout_id"),
  KEY "idx_event_takeout_items_menu_item" ("menu_item_id"),
  CONSTRAINT "fk_event_takeout_items_request" FOREIGN KEY ("takeout_id") REFERENCES "event_takeout_requests" ("takeout_id") ON DELETE CASCADE
);

CREATE TABLE "event_takeout_requests" (
  "takeout_id" bigint unsigned NOT NULL AUTO_INCREMENT,
  "reservation_id" varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  "quantity" int unsigned NOT NULL,
  "status" varchar(24) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'requested',
  "requested_by" int DEFAULT NULL,
  "requested_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "completed_at" timestamp NULL DEFAULT NULL,
  "request_key" varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY ("takeout_id"),
  UNIQUE KEY "uq_event_takeout_request_key" ("reservation_id","request_key"),
  KEY "idx_event_takeout_reservation_status" ("reservation_id","status")
);

CREATE TABLE "inventory" (
  "inventory_id" int NOT NULL AUTO_INCREMENT,
  "item_name" varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "category" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "quantity" decimal(10,2) DEFAULT NULL,
  "unit" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "unit_price" decimal(10,2) DEFAULT NULL,
  "expiry_date" date DEFAULT NULL,
  "supplier" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "storage_location" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "reorder_level" decimal(10,2) DEFAULT NULL,
  "last_updated" datetime DEFAULT NULL,
  "status" enum('Available','Low Stock','Out of Stock','Expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Available',
  PRIMARY KEY ("inventory_id")
);

CREATE TABLE "inventory_storage_locations" (
  "storage_id" int NOT NULL AUTO_INCREMENT,
  "storage_name" varchar(100) NOT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("storage_id"),
  UNIQUE KEY "uq_inventory_storage_name" ("storage_name")
);

CREATE TABLE "inventory_units" (
  "unit_id" int NOT NULL AUTO_INCREMENT,
  "unit_name" varchar(50) NOT NULL,
  "unit_group" varchar(30) DEFAULT 'Other',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("unit_id"),
  UNIQUE KEY "uq_inventory_units_name" ("unit_name")
);

CREATE TABLE "kiosk_orders" (
  "order_id" int NOT NULL AUTO_INCREMENT,
  "reservation_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "item_id" int DEFAULT NULL,
  "quantity" int NOT NULL DEFAULT '1',
  "kitchen_status" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customizations" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "is_refill" tinyint(1) DEFAULT '0',
  "allergy_note" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY ("order_id"),
  KEY "item_id" ("item_id"),
  KEY "kiosk_orders_ibfk_1" ("reservation_id"),
  CONSTRAINT "fk_order_to_product" FOREIGN KEY ("item_id") REFERENCES "menu_items" ("item_id") ON DELETE SET NULL
);

CREATE TABLE "menu_item_creation_requests" (
  "submission_key" varchar(128) NOT NULL,
  "payload_hash" char(64) NOT NULL,
  "item_id" int DEFAULT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("submission_key"),
  KEY "idx_menu_creation_requests_created" ("created_at")
);

CREATE TABLE "menu_item_ingredients" (
  "recipe_id" int NOT NULL AUTO_INCREMENT,
  "item_id" int NOT NULL,
  "inventory_id" int NOT NULL,
  "quantity_required" decimal(10,2) NOT NULL,
  PRIMARY KEY ("recipe_id"),
  KEY "fk_product_link" ("item_id"),
  KEY "fk_inventory_link" ("inventory_id"),
  CONSTRAINT "fk_inventory_link" FOREIGN KEY ("inventory_id") REFERENCES "inventory" ("inventory_id") ON DELETE CASCADE,
  CONSTRAINT "fk_product_link" FOREIGN KEY ("item_id") REFERENCES "menu_items" ("item_id") ON DELETE CASCADE
);

CREATE TABLE "menu_items" (
  "item_id" int NOT NULL AUTO_INCREMENT,
  "category_id" int DEFAULT NULL,
  "menu_name" varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "description" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "price" int NOT NULL,
  "discount_price" decimal(10,2) DEFAULT NULL,
  "image_url" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "is_available" tinyint(1) DEFAULT '1',
  "is_featured" tinyint(1) DEFAULT '0',
  "local_path" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY ("item_id"),
  KEY "category_id" ("category_id"),
  CONSTRAINT "menu_items_ibfk_1" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id")
);

CREATE TABLE "municipalities" (
  "muni_code" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "muni_name" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY ("muni_code")
);

CREATE TABLE "notifications" (
  "notification_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "reservation_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "title" varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "message" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "type" enum('success','promo','info','alert') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'info',
  "is_read" tinyint(1) DEFAULT '0',
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" datetime DEFAULT NULL,
  "deleted_at" timestamp NULL DEFAULT NULL,
  "deleted_by" varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY ("notification_id"),
  KEY "user_id" ("user_id"),
  CONSTRAINT "notifications_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE
);

CREATE TABLE "payments" (
  "payment_id" int NOT NULL AUTO_INCREMENT,
  "reservation_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "payment_method" enum('Cash','GCash') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "payment_status" enum('pending','verified','rejected','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  "paid_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total_bill" decimal(12,2) DEFAULT '0.00',
  "rejection_reason" varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "rejected_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("payment_id"),
  UNIQUE KEY "reservation_id" ("reservation_id"),
  KEY "payments_ibfk_1" ("reservation_id"),
  CONSTRAINT "payments_ibfk_1" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("reservation_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "refund_requests" (
  "refund_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int DEFAULT NULL,
  "reservation_id" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "subject" varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "comment" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "email" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "reason" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "reservation_type" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "status" enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "refund_amount" decimal(10,2) DEFAULT NULL,
  PRIMARY KEY ("refund_id"),
  KEY "user_id" ("user_id"),
  CONSTRAINT "refund_requests_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE
);

CREATE TABLE "reservation_tables" (
  "reservation_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "table_id" int NOT NULL,
  "customer_name" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "status" enum('pending','confirmed','seated','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  "check_in_time" datetime DEFAULT NULL,
  "kiosk_mode" enum('default','unlimited_wings_a','unlimited_wings_b','unlimited_wings_c') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'default',
  PRIMARY KEY ("reservation_id","table_id"),
  KEY "table_id" ("table_id"),
  CONSTRAINT "reservation_tables_ibfk_1" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("reservation_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reservation_tables_ibfk_2" FOREIGN KEY ("table_id") REFERENCES "tables" ("table_id") ON DELETE CASCADE
);

CREATE TABLE "reservations" (
  "reservation_id" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "user_id" int DEFAULT NULL,
  "first_name" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "last_name" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "email" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "phone" varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "reservation_date" date NOT NULL,
  "reservation_time" time NOT NULL,
  "end_time" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "duration_hours" decimal(5,2) DEFAULT '1.00',
  "num_guests" int DEFAULT '1',
  "package_name" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "status" enum('Pending','Confirmed','Seated','Completed','Cancelled','Rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Pending',
  "receipt_path" varchar(110) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "brgy_code" varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "allergy" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "allergy_count" int DEFAULT '0',
  "expires_at" datetime DEFAULT NULL,
  "occasion" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "cancellation_reason" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  "cancelled_at" datetime DEFAULT NULL,
  "downpayment_amount" decimal(10,2) DEFAULT '0.00',
  "is_kiosk_active" tinyint DEFAULT '0',
  "reservation_type" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'per_table',
  PRIMARY KEY ("reservation_id"),
  KEY "user_id" ("user_id"),
  KEY "fk_res_brgy" ("brgy_code"),
  CONSTRAINT "fk_res_brgy" FOREIGN KEY ("brgy_code") REFERENCES "barangays" ("brgy_code"),
  CONSTRAINT "reservations_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE SET NULL
);

CREATE TABLE "reviews" (
  "review_id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "rating" int NOT NULL,
  "comment" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("review_id"),
  KEY "user_id" ("user_id"),
  CONSTRAINT "reviews_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE,
  CONSTRAINT "reviews_chk_1" CHECK (((`rating` >= 1) and (`rating` <= 5)))
);

CREATE TABLE "system_settings" (
  "id" int NOT NULL AUTO_INCREMENT,
  "setting_key" varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "setting_value" text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "setting_key" ("setting_key")
);

CREATE TABLE "tables" (
  "table_id" int NOT NULL AUTO_INCREMENT,
  "table_number" varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  "capacity" int DEFAULT NULL,
  "available_seats" int DEFAULT NULL,
  "status" varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY ("table_id")
);

CREATE TABLE "users" (
  "user_id" int NOT NULL AUTO_INCREMENT,
  "first_name" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "last_name" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "email" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "password_hash" varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "role" enum('admin','customer','cashier','cook') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'customer',
  "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
  "reset_password_token" varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  "reset_password_expires" bigint DEFAULT NULL,
  "cancellation_count" int DEFAULT '0',
  "last_cancellation_time" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("user_id")
);

-- FK Relationships
-- audit_logs.user_id -> users.user_id
-- barangays.muni_code -> municipalities.muni_code
-- event_takeout_items.takeout_id -> event_takeout_requests.takeout_id
-- kiosk_orders.item_id -> menu_items.item_id
-- menu_item_ingredients.inventory_id -> inventory.inventory_id
-- menu_item_ingredients.item_id -> menu_items.item_id
-- menu_items.category_id -> categories.category_id
-- notifications.user_id -> users.user_id
-- payments.reservation_id -> reservations.reservation_id
-- refund_requests.user_id -> users.user_id
-- reservation_tables.reservation_id -> reservations.reservation_id
-- reservation_tables.table_id -> tables.table_id
-- reservations.brgy_code -> barangays.brgy_code
-- reservations.user_id -> users.user_id
-- reviews.user_id -> users.user_id
