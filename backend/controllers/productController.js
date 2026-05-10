const { get } = require("node:http");
const Product = require("../models/Product");

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
    const {
      name,
      description,
      price,
      category_id,
      is_available,
      is_featured,
    } = req.body;

    // 1. Convert to proper types for MySQL
    const clean_price = parseFloat(price) || 0.0;
    const clean_category = parseInt(category_id);
    const clean_available = parseInt(is_available) === 0 ? 0 : 1;
    const clean_featured = parseInt(is_featured) === 1 ? 1 : 0;

    // 2. Prepare the Local Path (For Offline Kiosk)
    // Construct the string that getImageUrl helper expects: /uploads/filename.jpg
    const local_path = req.file ? `/uploads/${req.file.filename}` : null;

    let cloudinary_url = null;

    // 3. Upload the same file to Cloudinary (For Online Reservations)
    if (req.file) {
      // req.file.path is the physical location on your server's disk
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "restaurant_products",
      });
      cloudinary_url = result.secure_url; // This is the https:// link
    }

    // 4. Save everything to the Database
    const newId = await Product.create({
      name,
      description,
      price: clean_price,
      category_id: clean_category,
      image_url: cloudinary_url, // Cloudinary link
      local_path: local_path,    // Local path
      is_available: clean_available,
      is_featured: clean_featured,
    });

    res.status(201).json({ success: true, id: newId });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error.message);
    res.status(400).json({ error: error.message });
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

    // If a new file is uploaded, update BOTH paths
    if (req.file) {
      // Local
      data.local_path = `/uploads/${req.file.filename}`;
      
      // Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "restaurant_products",
      });
      data.image_url = result.secure_url;
    }

    const result = await Product.update(id, data);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error.message);
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
