const Maintenance = require("../models/Maintenance");
const FinancialReport = require("../models/FinancialReport");
const { buildFinancialPdf } = require("../utils/financialPdf");
const { logActivity } = require("../utils/logger");

const maintenanceController = {
  // kiosk reservation
  updateKioskReservation: async (req, res) => {
    const { reservationId, kioskType = "single" } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required." });
    }
    if (!["event", "single"].includes(kioskType)) {
      return res.status(400).json({ error: "Kiosk type must be event or single." });
    }

    try {
      const result = await Maintenance.setKioskReservation(
        reservationId,
        kioskType,
      );

      if (result.affectedRows === 0) {
        if (result.reason === "type_mismatch") {
          return res.status(400).json({
            error: `This reservation is ${result.actualType === "event" ? "an event" : "a single-customer reservation"}. Choose the matching kiosk type.`,
          });
        }
        return res.status(404).json({ error: "Reservation ID not found." });
      }

      await logActivity(
        req.user?.userId || null,
        "UPDATE_KIOSK_RESERVATION",
        reservationId,
        { message: `Kiosk opened for ${kioskType} reservation.` },
        req,
      );

      const io = req.app.get("io");
      if (io) io.emit("table_updated");

      res.json({
        message: `Kiosk opened for ${kioskType} reservation ${reservationId}.`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update kiosk reservation." });
    }
  },

  // OPTIMIZE STORAGE
  reset: async (req, res) => {
    try {
      const count = await Maintenance.resetFloorStatus();
      await logActivity(
        req.user?.userId || null,
        "RESET_FLOOR_LAYOUT_STATUS",
        null,
        {
          affected_tables_count: count,
          message:
            "Manual shift reset completed. All tables cleared and set to available.",
        },
        req,
      );
      res.json({
        message: `Shift Reset Complete! ${count} tables are now Available and ready for new guests.`,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to reset tables in the database." });
    }
  },

  // EXPORT TO CSV (Replacement for SQL Backup)
  exportData: async (req, res) => {
    try {
      const data = await Maintenance.getExportData();
      if (data.length === 0) return res.status(404).send("No data to export");

      await logActivity(
        req.user?.userId || null,
        "EXPORT_TRANSACTIONS_DATA_CSV",
        null,
        { message: "Manual business report export to CSV format requested." },
        req,
      );

      // Create CSV Header
      const fields = Object.keys(data[0]);
      const csvRows = [fields.join(",")]; // Header row

      // Create Data Rows
      for (const row of data) {
        const values = fields.map((field) => {
          const val = row[field] === null ? "" : row[field];
          return `"${val.toString().replace(/"/g, '""')}"`; // Escape quotes
        });
        csvRows.push(values.join(","));
      }

      const csvString = csvRows.join("\n");
      const fileName = `Business_Report_${Date.now()}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.status(200).send(csvString);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate report." });
    }
  },

  exportFinancialPdf: async (req, res) => {
    try {
      const { startDate, endDate } = req.query; 

      // Fetch financial summary stats and the daily trend data concurrently
      const [stats, dailyTrend] = await Promise.all([
        FinancialReport.getPdfStats(startDate, endDate),
        FinancialReport.getPdfDailyTrend(startDate, endDate),
      ]);

      const doc = buildFinancialPdf({
        title: "Financial Performance Report",
        payload: {
          summary: stats || {},
          trends: {
            daily: dailyTrend || [], // Pass the retrieved daily trend list to the PDF builder
          },
        },
        startDate: startDate,
        endDate: endDate,
      });

      res.setHeader("Content-Type", "application/pdf");
      doc.pipe(res);
      doc.end();

      await logActivity(
        req.user?.userId || null,
        "EXPORT_FINANCIAL_REPORT_PDF",
        null,
        {
          message: `Financial report generated for period: ${startDate} to ${endDate}`,
        },
        req,
      );
    } catch (error) {
      console.error("exportFinancialPdf error:", error);
      res.status(500).json({ error: "Failed to generate financial PDF." });
    }
  },
};

module.exports = maintenanceController;