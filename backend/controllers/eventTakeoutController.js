const EventTakeout = require("../models/EventTakeout");

const emitTakeoutUpdate = (req, reservationId) => {
  const io = req.app.get("io");
  if (io) {
    io.emit("event_takeout_updated", { reservationId });
    io.emit("table_updated");
  }
};

const eventTakeoutController = {
  getSummary: async (req, res) => {
    try {
      res.json(await EventTakeout.getSummary(req.params.id, req.user));
    } catch (error) {
      res.status(400).json({ error: error.message || "Failed to load event takeout." });
    }
  },

  createRequest: async (req, res) => {
    try {
      const summary = await EventTakeout.createRequest(
        req.params.id,
        req.body?.items,
        req.user?.userId || req.user?.id,
        req.body?.request_key,
        req.user,
      );
      emitTakeoutUpdate(req, req.params.id);
      res.status(201).json(summary);
    } catch (error) {
      res.status(400).json({ error: error.message || "Failed to create takeout request." });
    }
  },

  getActiveRequests: async (_req, res) => {
    try {
      res.json(await EventTakeout.getActiveRequests());
    } catch (error) {
      console.error("Event takeout tickets error:", error);
      res.status(500).json({ error: "Failed to load takeout tickets." });
    }
  },

  updateStatus: async (req, res) => {
    const nextStatus = String(req.body?.status || "").toLowerCase();
    const role = String(req.user?.role || "").toLowerCase();
    if (nextStatus === "completed" && !["admin", "cashier", "staff"].includes(role)) {
      return res.status(403).json({
        error: "Only Cashier or Admin can complete a takeout handoff.",
      });
    }

    try {
      const result = await EventTakeout.updateStatus(req.params.id, nextStatus);
      emitTakeoutUpdate(req, result.reservation_id);
      res.json(result.summary);
    } catch (error) {
      res.status(400).json({ error: error.message || "Failed to update takeout status." });
    }
  },
};

module.exports = eventTakeoutController;
