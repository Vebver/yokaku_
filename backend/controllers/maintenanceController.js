const Maintenance = require('../models/Maintenance');
const path = require('path');
const fs = require('fs');

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
      res.json({ message: `Storage Optimized. ${count} old receipt images were cleared to save space.` });
    } catch (error) {
      res.status(500).json({ error: "Failed to optimize storage." });
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
  }
};

module.exports = maintenanceController;