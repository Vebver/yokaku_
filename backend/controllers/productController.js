const { get } = require("node:http");
const Product = require("../models/Product");
const PriceMaintenance = require('../models/PriceMaintenance');
const Setting = require("../models/Settings"); // 1. IMPORT YOUR SETTINGS MODEL
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const applyPeakPricing = async (products) => {
  try {
    // 1. Wrap the DB call in its own try/catch
    let settings;
    try {
      settings = await PriceMaintenance.getSettings();
    } catch (dbErr) {
      console.error("⚠️ PEAK PRICING DB ERROR (Table probably missing):", dbErr.message);
      return products; // Return normal prices instead of crashing
    }

    if (!settings) return products;

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; 
    const isPeakEnabled = Number(settings.is_peak_enabled) === 1;
    const isWithinTimeRange = currentTime >= settings.peak_start_time && 
                              currentTime <= settings.peak_end_time;

    const isPeakActive = isPeakEnabled && isWithinTimeRange;

    return products.map(p => {
      let finalPrice = parseFloat(p.price);
      if (isPeakActive) {
        const increasePercent = parseInt(settings.peak_increase_percent) / 100;
        finalPrice = finalPrice * (1 + increasePercent);
      }
      return {
        ...p,
        original_price: p.price,
        price: finalPrice.toFixed(2),
        isPeakActive: isPeakActive 
      };
    });
  } catch (err) {
    console.error("❌ PEAK PRICING LOGIC CRASH:", err);
    return products; // ALWAYS return products so the app doesn't show 500
  }
};

const productController = {
  // UPDATED: Now applies peak pricing
  getProducts: async (req, res) => {
    try {
      const products = await Product.getAll();
      
      let adjustedProducts = products;
      try {
        // Wrap ONLY the pricing logic in its own try/catch
        // This ensures if pricing fails, the menu still shows normally
        adjustedProducts = await applyPeakPricing(products); 
      } catch (priceErr) {
        console.error("Pricing logic failed, showing normal prices:", priceErr);
      }
      
      res.json(adjustedProducts);
    } catch (error) {
      console.error("Main Controller Error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // UPDATED: Now applies peak pricing
  getFeaturedProducts: async (req, res) => {
    try {
      const items = await Product.getFeatured();
      const adjustedItems = await applyPeakPricing(items); // 3. APPLY LOGIC
      res.status(200).json(adjustedItems);
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ error: "Failed to fetch featured items" });
    }
  },

  // ... (Keep the rest of your toggleFeature, createProduct, updateProduct, etc. as they are)
  
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
      const { name, description, price, category_id, is_available, is_featured } = req.body;
      if (!req.file) return res.status(400).json({ error: "No image file provided." });

      const local_disk_path = `/uploads/${req.file.filename}`;
      let cloudinary_url = null;

      try {
        const cloudResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "restaurant_products",
        });
        cloudinary_url = cloudResult.secure_url;
      } catch (cloudErr) {
        console.error("Cloudinary Logic Error:", cloudErr.message);
      }

      const newId = await Product.create({
        name,
        description,
        price: parseFloat(price) || 0,
        category_id: parseInt(category_id),
        image_url: local_disk_path, 
        local_path: cloudinary_url, 
        is_available: parseInt(is_available) || 1,
        is_featured: parseInt(is_featured) || 0,
      });

      res.status(201).json({ success: true, id: newId, cloudinary: cloudinary_url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      await Product.delete(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, category_id, is_available, is_featured } = req.body;

      const data = {
        name,
        description,
        price: parseFloat(price) || 0.0,
        category_id: parseInt(category_id),
        is_available: parseInt(is_available),
        is_featured: parseInt(is_featured)
      };

      if (req.file) {
        data.image_url = `/uploads/${req.file.filename}`;
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "restaurant_products",
          });
          data.local_path = result.secure_url; 
        } catch (err) {
          console.error("Cloudinary update failed:", err.message);
        }
      }

      const result = await Product.update(id, data);
      res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getIngredients: async (req, res) => {
    try {
      const ingredients = await Product.getIngredients(req.params.id);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addIngredient: async (req, res) => {
    try {
      const { inventory_id, quantity_required } = req.body;
      await Product.addIngredient({
        item_id: req.params.id,
        inventory_id,
        quantity_required,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeIngredient: async (req, res) => {
    try {
      const success = await Product.removeIngredient(req.params.recipeId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;