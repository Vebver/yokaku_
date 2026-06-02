const Maintenance = require('../models/Maintenance');
const FinancialReport = require('../models/FinancialReport');
const { buildFinancialPdf } = require('../utils/financialPdf');

const maintenanceController = {
  // ARCHIVE OLD RECORDS
  archiveRecords: async (req, res) => {
    try {
      const count = await Maintenance.archiveOldRecords();
      res.json({ message: `System Archive Complete. Moved ${count} old records to history.` });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive records." });
    }
  },

  // OPTIMIZE STORAGE
 reset: async (req, res) => {
    try {
      const count = await Maintenance.resetFloorStatus();
      res.json({ message: `Shift Reset Complete! ${count} tables are now Available and ready for new guests.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to reset tables in the database." });
    }
  },

  // EXPORT TO CSV (Replacement for SQL Backup)
  exportData: async (req, res) => {
    try {
      const data = await Maintenance.getExportData();
      if (data.length === 0) return res.status(404).send("No data to export");

      // Create CSV Header
      const fields = Object.keys(data[0]);
      const csvRows = [fields.join(',')]; // Header row

      // Create Data Rows
      for (const row of data) {
        const values = fields.map(field => {
          const val = row[field] === null ? "" : row[field];
          return `"${val.toString().replace(/"/g, '""')}"`; // Escape quotes
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const fileName = `Business_Report_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.status(200).send(csvString);
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate report." });
    }
  },

  // DOWNLOAD FINANCIAL REPORT AS PDF (Profit Weekly/Monthly/Yearly + Revenue Trends)
// Inside controllers/maintenanceController.js

exportFinancialPdf: async (req, res) => {
  try {
    // 1. Get the local date string to prevent undefined bind parameters
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    const [stats, profitWeekly, profitMonthly, profitYearly, weeklyTrend, monthlyTrend, yearlyTrend] = await Promise.all([
      FinancialReport.getFinancialStats(todayStr),
      FinancialReport.getProfitWeekly(todayStr),        // Pass todayStr
      FinancialReport.getProfitMonthly(todayStr),       // Pass todayStr
      FinancialReport.getProfitYearly(todayStr),        // Pass todayStr
      FinancialReport.getWeeklyProfitTrend(todayStr),   // Pass todayStr
      FinancialReport.getMonthlyTrend(), 
      FinancialReport.getYearlyProfitTrend(todayStr)    // Pass todayStr
    ]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Financial_Report_${Date.now()}.pdf"`,
      );

      const doc = buildFinancialPdf({
        title: 'Financial Report (Profit & Revenue Trend)',
        payload: {
          summary: stats || {},
          profit: {
            weekly: profitWeekly || 0,
            monthly: profitMonthly || 0,
            yearly: profitYearly || 0,
          },
          trends: {
            weekly: weeklyTrend || [],
            monthly: monthlyTrend || [],
            yearly: yearlyTrend || [],
          },
        },
      });

      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error('exportFinancialPdf error:', error);
      res.status(500).json({ error: 'Failed to generate financial PDF.' });
    }
  }
};

module.exports = maintenanceController;
