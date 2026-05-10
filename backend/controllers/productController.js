const { get } = require("node:http");
const Product = require("../models/Product");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const productController = {
  getProducts: async (req, res) => {
    try {
      const products = await Product.getAll();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getFeaturedProducts: async (req, res) => {
    try {
      // Call the Model logic
      const items = await Product.getFeatured();

      // Send the data to the frontend
      res.status(200).json(items);
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ error: "Failed to fetch featured items" });
    }
  },

  //
  toggleFeature: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_featured } = req.body;

      // Call the Model method
      await Product.updateFeatureStatus(id, is_featured);

      res.json({ message: "Featured status updated successfully" });
    } catch (error) {
      console.error("Toggle Feature Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

createProduct: async (req, res) => {
  try {
    const { name, description, price, category_id, is_available, is_featured } = req.body;

    // 1. Check if Multer actually received a file
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    // 2. Prepare paths
    // image_url will store the local /uploads path
    const local_disk_path = `/uploads/${req.file.filename}`;
    let cloudinary_url = null;

    // 3. Upload to Cloudinary
    try {
      // req.file.path is the absolute physical path (e.g., C:\project\backend\uploads\xxx.jpg)
      const cloudResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "restaurant_products",
      });
      
      cloudinary_url = cloudResult.secure_url;
      console.log("Cloudinary Upload Successful:", cloudinary_url);
    } catch (cloudErr) {
      console.error("Cloudinary Logic Error:", cloudErr.message);
      // We don't return here so that the product is still created locally even if cloud fails
    }

    // 4. Save to Database
    // image_url = LOCAL (/uploads/...)
    // local_path = CLOUDINARY (https://res.cloudinary...)
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
    console.error("Database Save Error:", error.message);
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
        // Update Local
        data.image_url = `/uploads/${req.file.filename}`;
        
        // Update Cloudinary
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
      // Call Model
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
      // Call Model
      const success = await Product.removeIngredient(req.params.recipeId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;
