const db = require("../config/db");

const addressController = {
  getMunicipalities: async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT muni_code AS code, muni_name AS name FROM municipalities ORDER BY name ASC"
      );
      res.json(rows);
    } catch (error) {
      console.error("Local Municipality Fetch Error:", error.message);
      res.status(500).json({ error: "Database error" });
    }
  },

  getBarangays: async (req, res) => {
    try {
        // This now works because it matches the name in the router
        const { municipalityCode } = req.params; 

        if (!municipalityCode || municipalityCode === "undefined") {
            return res.json([]);
        }

        const [rows] = await db.execute(
            `SELECT brgy_code AS code, brgy_name AS name 
             FROM barangays 
             WHERE TRIM(muni_code) = TRIM(?) 
             ORDER BY name ASC`,
            [municipalityCode]
        );

        console.log(`Backend received: ${municipalityCode} | Found: ${rows.length} barangays`);
        res.json(rows);
    } catch (error) {
        console.error("Barangay Error:", error.message);
        res.status(500).json({ error: error.message });
    }
}
};

module.exports = addressController;