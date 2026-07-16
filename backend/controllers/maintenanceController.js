const Maintenance = require("../models/Maintenance");
const FinancialReport = require("../models/FinancialReport");
const { buildFinancialPdf } = require("../utils/financialPdf");
const { logActivity } = require("../utils/logger");

const maintenanceController = {
  // kiosk reservation
  updateKioskReservation: async (req, res) => {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "Reservation ID is required." });
    }

    try {
      const affectedRows = await Maintenance.setKioskReservation(reservationId);

      if (affectedRows === 0) {
        return res.status(404).json({ error: "Reservation ID not found." });
      }

      await logActivity(
        req.user?.userId || null,
        "UPDATE_KIOSK_RESERVATION",
        reservationId,
        { message: "Reservation focus manually pushed to kiosk display." },
        req,
      );

      res.json({
        message: `Kiosk updated successfully with Reservation ID ${reservationId}.`,
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

      // 1. CALL THE NEW "PDF" SPECIFIC FUNCTIONS
      const [stats, weeklyTrend, monthlyTrend, yearlyTrend] = await Promise.all([
        FinancialReport.getPdfStats(startDate, endDate),
        FinancialReport.getPdfWeeklyTrend(startDate, endDate),
        FinancialReport.getPdfMonthlyTrend(startDate, endDate),
        FinancialReport.getPdfYearlyTrend(startDate, endDate),
      ]);

      const doc = buildFinancialPdf({
        title: "Financial Performance Report",
        payload: {
          summary: stats || {},
          trends: {
            weekly: weeklyTrend || [],
            monthly: monthlyTrend || [],
            yearly: yearlyTrend || [],
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
