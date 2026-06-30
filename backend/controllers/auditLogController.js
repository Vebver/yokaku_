const AuditLog = require("../models/AuditLog");

exports.getAuditLogs = async (req, res) => {
  try {
    // Restrict access to admin or manager roles
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ error: "Access denied. Admins and managers only." });
    }

    const logs = await AuditLog.getAll();
    
    // Clean up JSON strings in details to make them readable for the user interface
    const processedLogs = logs.map(log => {
      let friendlyDetails = log.details;
      if (typeof log.details === "string" && log.details.trim().startsWith("{")) {
        try {
          const obj = JSON.parse(log.details);
          friendlyDetails = Object.entries(obj)
            .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
            .join(" | ");
        } catch (e) {
          friendlyDetails = log.details;
        }
      }
      return {
        ...log,
        details: friendlyDetails || "No additional parameters logged"
      };
    });

    res.json(processedLogs);
  } catch (error) {
    console.error("Error retrieving audit trails:", error);
    res.status(500).json({ error: error.message });
  }
};