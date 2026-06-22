const Product = require("../models/Product");
// Commented out unused model during peak-pricing disablement
// const PriceMaintenance = require("../models/PriceMaintenance");
const Setting = require("../models/Settings"); 
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
      
      // COMMENTED OUT: Peak Pricing adjustment
      // const adjusted = await applyPeakPricing(Array.isArray(products) ? products : []);
      // res.json(adjusted);
      
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
      const local_disk_path = `/uploads/${req.file.filename}`;
      let cloudinary_url = null;
      try {
        const cloudResult = await cloudinary.uploader.upload(req.file.path, { folder: "restaurant_products" });
        cloudinary_url = cloudResult.secure_url;
      } catch (cloudErr) { console.error("Cloudinary Error:", cloudErr.message); }

      const newId = await Product.create({
        menu_name, description, price: parseFloat(price) || 0,
        category_id: parseInt(category_id), image_url: local_disk_path, 
        local_path: cloudinary_url, is_available: parseInt(is_available) || 1,
        is_featured: parseInt(is_featured) || 0,
      });
      res.status(201).json({ success: true, id: newId });
    } catch (error) { res.status(500).json({ error: error.message }); }
  },

  deleteProduct: async (req, res) => {
    try {
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
      res.json({ success: true, message: "Product updated successfully" });
    } catch (error) { res.status(500).json({ error: error.message }); }
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