const Product = require("../models/Product");
const UnlimitedPackage = require("../models/UnlimitedPackage");
const crypto = require("crypto");
const fs = require("fs/promises");
// Commented out unused model during peak-pricing disablement
// const PriceMaintenance = require("../models/PriceMaintenance");
const Setting = require("../models/Settings"); 
const { logActivity } = require("../utils/logger");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// // --- HELPER FUNCTION (Declare this ONLY ONCE) ---
// // COMMENTED OUT: Peak Pricing helper is disabled
// const applyPeakPricing = async (products) => {
//   if (!Array.isArray(products)) return products;
//   try {
//     const settings = await PriceMaintenance.getSettings();
//     if (!settings) {
//       console.log("❌ PEAK ERROR: Row ID 1 missing in price_maintenance table.");
//       return products;
//     }
//     const now = new Date();
//     const currentTime = now.toLocaleTimeString("en-GB", { 
//       timeZone: "Asia/Manila", 
//       hour12: false 
//     });
//     const isPeakEnabled = Number(settings.is_peak_enabled) === 1;
//     const startTime = settings.peak_start_time.length === 5 ? settings.peak_start_time + ":00" : settings.peak_start_time;
//     const endTime = settings.peak_end_time.length === 5 ? settings.peak_end_time + ":00" : settings.peak_end_time;
//     const isWithinTimeRange = currentTime >= startTime && currentTime <= endTime;
//     const isPeakActive = isPeakEnabled && isWithinTimeRange;
//     console.log("-----------------------------------------");
//     console.log("PEAK STATUS:", isPeakEnabled ? "ENABLED" : "DISABLED");
//     console.log("CURRENT TIME (Manila):", currentTime);
//     console.log("PEAK RANGE:", startTime, "to", endTime);
//     console.log("IS PEAK ACTIVE? ->", isPeakActive);
//     console.log("-----------------------------------------");
//     return products.map(p => {
//       let finalPrice = parseFloat(p.price) || 0;
//       if (isPeakActive) {
//         const increasePercent = parseInt(settings.peak_increase_percent) || 0;
//         finalPrice = finalPrice * (1 + (increasePercent / 100));
//       }
//       return {
//         ...p,
//         original_price: p.price, 
//         price: finalPrice.toFixed(2), 
//         isPeakActive: isPeakActive 
//       };
//     });
//   } catch (err) {
//     console.error("Peak Pricing Logic Error:", err);
//     return products;
//   }
// };

// --- CONTROLLER OBJECT ---
const productController = {
  getProducts: async (req, res) => {
    try {
      const products = await Product.getAll();
      
      // Attach dynamic Unlimited package inclusions (if configured) so the
      // kiosk and admin UI can use DB-driven package rules.
      let inclusionRows = [];
      try {
        inclusionRows = await UnlimitedPackage.getAll();
      } catch (err) {
        console.warn("Inclusions load failed:", err.message);
      }
      if (inclusionRows.length > 0) {
        const grouped = {};
        for (const row of inclusionRows) {
          (grouped[row.package_item_id] ||= []).push({
            inclusion_id: row.inclusion_id,
            included_item_id: row.included_item_id,
            included_category_id: row.included_category_id,
            quantity_limit: row.quantity_limit,
            is_unlimited: Number(row.is_unlimited) === 1,
          });
        }
        for (const product of products) {
          product.package_inclusions = grouped[product.item_id] || [];
        }
      }
      
      // Send raw unadjusted products directly
      res.json(products);
    } catch (error) {
      console.error("getProducts Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getFeaturedProducts: async (req, res) => {
    try {
      const items = await Product.getFeatured();
      
      // COMMENTED OUT: Peak Pricing adjustment
      // const adjusted = await applyPeakPricing(Array.isArray(items) ? items : []);
      // res.status(200).json(adjusted);
      
      // Send raw unadjusted items directly
      res.status(200).json(items);
    } catch (error) {
      console.error("Featured Error:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  },

  toggleFeature: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_featured } = req.body;
      await Product.updateFeatureStatus(id, is_featured);
      res.json({ message: "Featured status updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const { menu_name, description, price, category_id, is_available, is_featured } = req.body;
      if (!req.file) return res.status(400).json({ error: "No image file provided." });
      const submissionKey = req.get("Idempotency-Key");
      if (submissionKey && submissionKey.length > 128) {
        return res.status(400).json({ error: "Invalid submission key." });
      }
      const imageHash = crypto
        .createHash("sha256")
        .update(await fs.readFile(req.file.path))
        .digest("hex");
      const payloadHash = crypto
        .createHash("sha256")
        .update(JSON.stringify([
          req.user?.userId || null,
          menu_name,
          description,
          price,
          category_id,
          is_available,
          is_featured,
          imageHash,
        ]))
        .digest("hex");
      const local_disk_path = `/uploads/${req.file.filename}`;
      let cloudinary_url = null;
      try {
        const cloudResult = await cloudinary.uploader.upload(req.file.path, { folder: "restaurant_products" });
        cloudinary_url = cloudResult.secure_url;
      } catch (cloudErr) { console.error("Cloudinary Error:", cloudErr.message); }

      const productData = {
        menu_name, description, price: parseFloat(price) || 0,
        category_id: parseInt(category_id), image_url: local_disk_path, 
        local_path: cloudinary_url, is_available: parseInt(is_available) || 1,
        is_featured: parseInt(is_featured) || 0,
      };
      const creation = submissionKey
        ? await Product.createWithIdempotency(productData, submissionKey, payloadHash)
        : { ...(await Product.create(productData)), duplicate: false };
      if (creation.conflict) {
        return res.status(409).json({ error: "This submission key was already used for different menu data." });
      }
      if (creation.duplicate) {
        return res.status(200).json({ success: true, id: creation.item_id, duplicate: true });
      }
      const newId = creation.item_id;

      // Dynamic package inclusions (Unlimited menus only).
      if (req.body.package_inclusions !== undefined) {
        const rawValue = req.body.package_inclusions;
        if (rawValue === null || rawValue === "") {
          await UnlimitedPackage.deleteForPackageItem(newId);
        } else {
          let parsed;
          try {
            parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          } catch (err) {
            return res.status(400).json({ error: "Package inclusions must be valid JSON." });
          }
          if (!Array.isArray(parsed)) {
            return res.status(400).json({ error: "Package inclusions must be a JSON array." });
          }
          await UnlimitedPackage.replace(newId, parsed);
        }
      }

      await logActivity(
        req.user?.userId || null,
        "CREATE_MENU_ITEM",
        newId,
        { menu_name, price: parseFloat(price) || 0, category_id: parseInt(category_id) },
        req,
      );

      res.status(201).json({ success: true, id: newId });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      await logActivity(
        req.user?.userId || null,
        "DELETE_MENU_ITEM",
        id,
        { message: "Menu item deleted permanently" },
        req,
      );

      await Product.delete(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { menu_name, description, price, category_id, is_available, is_featured } = req.body;
      const data = { menu_name, description, price: parseFloat(price) || 0.0, category_id: parseInt(category_id), is_available: parseInt(is_available), is_featured: parseInt(is_featured) };
      if (req.file) {
        data.image_url = `/uploads/${req.file.filename}`;
        try {
          const result = await cloudinary.uploader.upload(req.file.path, { folder: "restaurant_products" });
          data.local_path = result.secure_url;
        } catch (err) { console.error("Cloudinary update failed:", err.message); }
      }
      await Product.update(id, data);

      // Dynamic package inclusions (Unlimited menus only).
      if (req.body.package_inclusions !== undefined) {
        const rawValue = req.body.package_inclusions;
        if (rawValue === null || rawValue === "") {
          await UnlimitedPackage.deleteForPackageItem(id);
        } else {
          let parsed;
          try {
            parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          } catch (err) {
            return res.status(400).json({ error: "Package inclusions must be valid JSON." });
          }
          if (!Array.isArray(parsed)) {
            return res.status(400).json({ error: "Package inclusions must be a JSON array." });
          }
          if (parsed.length > 0) {
            await UnlimitedPackage.replace(id, parsed);
          } else {
            await UnlimitedPackage.deleteForPackageItem(id);
          }
        }
      }

      await logActivity(
        req.user?.userId || null,
        "UPDATE_MENU_ITEM",
        id,
        { menu_name, price: parseFloat(price) || 0, category_id: parseInt(category_id) },
        req,
      );

      res.json({ success: true, message: "Product updated successfully" });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  // Single query listing every menu item that already has a recipe, so the
  // Recipe Manager can show coverage without one request per dish.
  getRecipeCoverage: async (req, res) => {
    try {
      const linkedIds = await Product.getItemsWithRecipes();
      res.json({ linkedItemIds: linkedIds });
    } catch (error) {
      console.error("getRecipeCoverage Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  getIngredients: async (req, res) => {
    try {
      const ingredients = await Product.getIngredients(req.params.id);
      res.json(ingredients);
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  addIngredient: async (req, res) => {
    try {
      const { inventory_id, quantity_required } = req.body;
      await Product.addIngredient({ item_id: req.params.id, inventory_id, quantity_required });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  removeIngredient: async (req, res) => {
    try {
      const success = await Product.removeIngredient(req.params.recipeId);
      res.json({ success });
    } catch (error) { res.status(500).json({ error: error.message }); }
  }
};

module.exports = productController;