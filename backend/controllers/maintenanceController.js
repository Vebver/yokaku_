const Maintenance = require('../models/Maintenance');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const maintenanceController = {
     cleanReserve: async (req, res) => {
    try {
      const count = await Maintenance.cleanPending();
      res.json({ message: `Successfully cleared ${count} expired pending reservations.` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. CLEAN OLD IMAGES
  cleanStorage: async (req, res) => {
    try {
      const count = await Maintenance.cleanOldReceipts();
      res.json({ message: `Successfully deleted ${count} old receipt images to save space.` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 3. FIXED: DATABASE BACKUP
  backupDatabase: (req, res) => {
    // Ensure the backup directory exists or the command will fail
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `backup-${Date.now()}.sql`;
    const outputPath = path.join(backupDir, fileName);
    
    // IF THIS FAILS: Replace 'mysqldump' with the full path like:
    // ' "C:\\xampp\\mysql\\bin\\mysqldump.exe" '
    const mysqldumpPath = '"C:\\xampp\\mysql\\bin\\mysqldump.exe"'; 

    const dbUser = "root";
    const dbName = "yoyaku_db";

    const cmd = `${mysqldumpPath} -u ${dbUser} ${dbName} > "${outputPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("DUMP ERROR:", stderr);
        return res.status(500).json({ 
          error: "MySQL Dump failed.", 
          details: "Ensure mysqldump is in your System Path or provide the full path in the controller." 
        });
      }
      
      // Send the file to the browser
      res.download(outputPath, (err) => {
        if (err) console.error("Download error:", err);
        // Optional: delete the file from the server after download to keep it clean
        // fs.unlinkSync(outputPath); 
      });
    });
  }
};

module.exports = maintenanceController;