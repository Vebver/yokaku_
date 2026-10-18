const Setting = require("../models/Settings");

// Whitelist of keys the API accepts. Anything outside this list is rejected so
// the generic settings table cannot be polluted with arbitrary keys.
const ALLOWED_KEYS = [
  "gcash_number",
  "gcash_name",
  "footer_contact",
  "footer_about",
  "footer_terms",
];

// Defaults shown until the admin saves real content. They mirror the original
// hardcoded footer so the first deploy looks unchanged.
const FOOTER_DEFAULTS = {
  footer_contact:
    "Facebook: Hangout Resto Marilao Bulacan\nEmail: abrevointernational@gmail.com\nPhone: 0905 804 5458",
  footer_about:
    "Location: Purok 3, Ibayo, Marilao, Bulacan, 3019 (PS Bank RCH Building near 7-Eleven)\nOpen Daily: 10:00 AM - 11:00 PM",
  footer_terms: "",
};

const settingController = {
  getSettings: async (req, res) => {
  try {
    const rows = await Setting.getAll();

    const settingsMap = {};
    // Ensure rows is an array before looping
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        if (row && row.setting_key) {
          settingsMap[row.setting_key] = row.setting_value;
        }
      });
    }

    res.json({
      gcash_number: settingsMap.gcash_number || "09123456789",
      gcash_name: settingsMap.gcash_name || "Hangout Resto Bar",
      ...settingsMap,
      // Footer sections fall back to defaults when not yet saved by the admin.
      footer_contact: settingsMap.footer_contact || FOOTER_DEFAULTS.footer_contact,
      footer_about: settingsMap.footer_about || FOOTER_DEFAULTS.footer_about,
      footer_terms: settingsMap.footer_terms || FOOTER_DEFAULTS.footer_terms,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.json({
      gcash_number: "09123456789",
      gcash_name: "Hangout Resto Bar",
    });
  }
},

  updateSettings: async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ error: "No settings" });
      }

      // Validation: only whitelisted keys, and values must be non-empty text.
      const errors = [];
      const clean = {};
      for (const [key, rawValue] of Object.entries(settings)) {
        if (!ALLOWED_KEYS.includes(key)) {
          errors.push(`Unknown setting: ${key}`);
          continue;
        }
        const value = String(rawValue ?? "").trim();
        // footer_terms is optional: blank means "use the built-in terms".
        // All other keys are required and cannot be empty.
        if (!value && key !== "footer_terms") {
          errors.push(
            `${key.replace("footer_", "Footer ").replace("_", " ")} cannot be empty.`,
          );
          continue;
        }
        clean[key] = value;
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(" ") });
      }

      const updatePromises = Object.entries(clean).map(([key, value]) => {
        return Setting.update(key, value);
      });

      await Promise.all(updatePromises);
      res.json({ message: "Updated successfully" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = settingController;
