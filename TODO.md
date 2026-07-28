s# Implementation Plan ✅ COMPLETED

## Task 1: Online Reservation - "Whole Table Reserve" for Event
- [x] Analyze codebase
- [x] **Edit OnlineReservations.jsx**: Show "Whole Table Reserve" instead of table numbers for event-type reservations

## Task 2: Audit Logs for Menu CRUD
- [x] **Edit productController.js**: Add audit logging for CREATE_MENU_ITEM, UPDATE_MENU_ITEM, DELETE_MENU_ITEM
- [x] **Edit categoryController.js**: Add audit logging for CREATE_CATEGORY, DELETE_CATEGORY
- [x] **Edit categoryRoutes.js**: Added auth middleware (protect, adminOnly) to category create/delete routes so req.user is available for audit logging

## Task 3: Inventory Bugs & Expired Products
- [x] **backend/models/Inventory.js**: 
  - Removed `supplier` from getAll SELECT, create INSERT, update UPDATE
  - Added priority-based ORDER BY (OUT OF STOCK → LOW STOCK → EXPIRED → HEALTHY)
- [x] **backend/controllers/inventoryController.js**: 

  - Fixed copy-paste bugs in updateInventoryItem audit log
  - Removed commented-out supplier references
  - Fixed all audit log action names to be unique
- [x] **frontend/Inventory.jsx**: 
  - Removed supplier from form state, data mapping, table & drawer
  - Changed "Supplier" column header to "Storage"
  - Changed table cell to show storage_location instead
  - Added `isExpired()` detection (expiry_date < today)
  - Added "EXPIRED" status badge (dark bg) shown after LOW STOCK
  - Fixed expiry highlighting: red for expired, warning for expiring-soon
  - Removed SUPPLIER field from add/edit drawer form

## Task 4: Expired Items in Inventory Report
- [x] **backend/models/Inventory.js**: Added `GetExpiredItems()` method that fetches items past expiry date
- [x] **backend/models/Inventory.js**: Added `expiry_date` to `GetInventoryUsage()` query result
- [x] **backend/controllers/reportController.js**: Added `expiredItems` fetch via `InventoryModel.GetExpiredItems()`
- [x] **backend/controllers/reportController.js**: Added `expired_items` and `expiredItems` to response data
- [x] **frontend/InventoryReport.jsx**: Added `expiredItems` destructuring from props
- [x] **frontend/InventoryReport.jsx**: Added "Expired Items" alert card below Low Stock card (dark theme)
- [x] **frontend/InventoryReport.jsx**: Added "Expiry" column to consumption table
- [x] **frontend/InventoryReport.jsx**: EXPIRED badge shown on expired items in table rows
- [x] **frontend/InventoryReport.jsx**: Row highlighting for expired items in consumption table
