const Reservation = require("../models/Reservation");

const reservationController = {
  checkUserActive: async (req, res) => {
    try {
      const hasActive = await Reservation.checkActiveByUserId(
        req.params.userId,
      );
      res.json({ hasActive });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  checkAvailability: async (req, res) => {
    try {
      const { date, tableId } = req.query;
      if (!date || !tableId) {
        return res
          .status(400)
          .json({ error: "Date and Table ID are required" });
      }

      const bookedSlots = await Reservation.getSlotsByTableAndDate(
        date,
        tableId,
      );
      res.json({ bookedSlots });
    } catch (error) {
      console.error("Availability Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  getTableStatuses: async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date || !startTime) return res.json({});
      const rows = await Reservation.getOccupiedTablesByTime(
        date,
        startTime,
        endTime,
      );

      const statusMap = {};
      rows.forEach((row) => {
        statusMap[row.table_id] = row.status;
      });
      res.json(statusMap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createReservation: async (req, res) => {
    try {
      const body = req.body;
      const requestedTables =
        typeof body.tableIds === "string"
          ? JSON.parse(body.tableIds)
          : body.tableIds;

      // 1. Check Conflicts
      const conflicts = await Reservation.checkTableConflicts(
        body.date,
        requestedTables,
        body.startTime,
        body.endTime,
      );
      if (conflicts.length > 0) {
        return res
          .status(400)
          .json({ message: "Table already occupied for this time." });
      }

      // 2. Execute Create in Model
      const newId = await Reservation.create({
        ...body,
        tableIds: requestedTables,
        receiptPath: req.file ? req.file.filename : null,
      });

      res.status(201).json({ id: newId, message: "Success!" });
    } catch (error) {
      console.error("CRITICAL BACKEND ERROR:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  getReservations: async (req, res) => {
    try {
      const data = await Reservation.getAll();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      await Reservation.updateStatus(req.params.id, req.body.status);
      res.json({ message: `Status updated to ${req.body.status}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteReservation: async (req, res) => {
    try {
      await Reservation.delete(req.params.id);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  checkReservationId: async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (reservation) res.json({ success: true, reservation });
      else res.status(404).json({ success: false, message: "Not found" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = reservationController;
