const axios = require('axios');

const addressController = {
    // Get Municipalities for Bulacan (Standard Code: 031400000)
    getMunicipalities: async (req, res) => {
        try {
            // Using the highly stable GitLab mirror with the correct Bulacan code
            const response = await axios.get("https://psgc.gitlab.io/api/provinces/031400000/cities-municipalities.json");
            res.json(response.data);
        } catch (error) {
            console.error("Municipality Fetch Error:", error.message);
            res.status(500).json({ error: "Failed to fetch municipalities. API might be down." });
        }
    },

    // Get Barangays based on City/Municipality Code
    getBarangays: async (req, res) => {
        try {
            const { code } = req.params;
            // Using the mirror for Barangays as well
            const response = await axios.get(`https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays.json`);
            res.json(response.data);
        } catch (error) {
            console.error("Barangay Fetch Error:", error.message);
            res.status(500).json({ error: "Failed to fetch barangays. API might be down." });
        }
    }
};

module.exports = addressController;