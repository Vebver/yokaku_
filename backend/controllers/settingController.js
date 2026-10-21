const Setting = require("../models/Settings");
const cloudinary = require("cloudinary").v2;

// Whitelist of keys the API accepts. Anything outside this list is rejected so
// the generic settings table cannot be polluted with arbitrary keys.
const ALLOWED_KEYS = [
  "gcash_number",
  "gcash_name",
  "footer_contact",
  "footer_about",
  "footer_terms",
  "kiosk_visible_categories",
  "exclusive_offers",
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
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          if (row && row.setting_key) {
            settingsMap[row.setting_key] = row.setting_value;
          }
        });
      }

      // Parse exclusive offers safely
      let exclusiveOffers = [];
      if (settingsMap.exclusive_offers) {
        try {
          exclusiveOffers = JSON.parse(settingsMap.exclusive_offers);
        } catch (e) {
          console.error("Failed to parse exclusive offers", e);
        }
      }

      res.json({
        gcash_number: settingsMap.gcash_number || "09123456789",
        gcash_name: settingsMap.gcash_name || "Hangout Resto Bar",
        ...settingsMap,
        footer_contact:
          settingsMap.footer_contact || FOOTER_DEFAULTS.footer_contact,
        footer_about: settingsMap.footer_about || FOOTER_DEFAULTS.footer_about,
        footer_terms: settingsMap.footer_terms || FOOTER_DEFAULTS.footer_terms,
        exclusive_offers: exclusiveOffers, // <-- NEW
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.json({
        gcash_number: "09123456789",
        gcash_name: "Hangout Resto Bar",
        exclusive_offers: [],
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
        if (key === "kiosk_visible_categories") {
          let categoryIds;
          try {
            categoryIds = JSON.parse(String(rawValue ?? ""));
          } catch {
            errors.push(
              "Kiosk visible categories must be a JSON array of category IDs.",
            );
            continue;
          }
          if (
            !Array.isArray(categoryIds) ||
            categoryIds.some(
              (id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1,
            )
          ) {
            errors.push(
              "Kiosk visible categories must be a JSON array of positive category IDs.",
            );
            continue;
          }
          clean[key] = JSON.stringify([...new Set(categoryIds.map(Number))]);
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
  // NEW: Upload Exclusive Offer
  uploadExclusiveOffer: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded." });
      }

      // Get current offers
      const currentSetting = await Setting.getByKey("exclusive_offers");
      let offers = [];
      if (currentSetting && currentSetting.setting_value) {
        try {
          offers = JSON.parse(currentSetting.setting_value);
        } catch (e) {}
      }

      // Add new image data (Cloudinary provides path and filename)
      const newOffer = {
        id: Date.now().toString(), // Unique ID for deletion
        url: req.file.path, // Cloudinary URL
        public_id: req.file.filename, // Cloudinary public ID for deletion
      };

      offers.push(newOffer);

      // Save back to DB
      await Setting.update("exclusive_offers", JSON.stringify(offers));

      res.json({ message: "Image uploaded successfully", offers });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload image." });
    }
  },

  // NEW: Delete Exclusive Offer
  deleteExclusiveOffer: async (req, res) => {
    try {
      const { id } = req.params;

      const currentSetting = await Setting.getByKey("exclusive_offers");
      if (!currentSetting || !currentSetting.setting_value) {
        return res.status(404).json({ error: "No offers found." });
      }

      let offers = JSON.parse(currentSetting.setting_value);
      const offerToDelete = offers.find((o) => o.id === id);

      if (!offerToDelete) {
        return res.status(404).json({ error: "Offer not found." });
      }

      // Delete from Cloudinary
      if (offerToDelete.public_id) {
        await cloudinary.uploader.destroy(offerToDelete.public_id);
      }

      // Remove from array and save
      offers = offers.filter((o) => o.id !== id);
      await Setting.update("exclusive_offers", JSON.stringify(offers));

      res.json({ message: "Image deleted successfully", offers });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete image." });
    }
  },
};

module.exports = settingController;
