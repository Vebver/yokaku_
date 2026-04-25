const { get } = require("node:http");
const Product = require("../models/Product");

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
      // 1. Get strings from req.body (Multer populates this)
      const {
        name,
        description,
        price,
        category_id,
        is_available,
        is_featured,
      } = req.body;

      // 2. Convert to proper types for MySQL
      const clean_price = parseFloat(price) || 0.0;
      const clean_category = parseInt(category_id);

      // IMPORTANT: FormData "0" or "1" must be converted to numbers
      const clean_available = parseInt(is_available) === 1 ? 1 : 0;
      const clean_featured = parseInt(is_featured) === 1 ? 1 : 0;

      // 3. Get image URL
      const image_url = req.file ? `/uploads/${req.file.filename}` : null;

      // 4. Call Model
      const newId = await Product.create({
        name,
        description,
        price: clean_price,
        category_id: clean_category,
        image_url,
        is_available: clean_available,
        is_featured: clean_featured,
      });

      res.status(201).json({ success: true, id: newId });
    } catch (error) {
      console.error("ADD PRODUCT ERROR:", error.message);
      res.status(400).json({ error: error.message }); // This sends the SQL error back to React
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

      // Clean/Convert data types
      const data = {
        name,
        description,
        price: parseFloat(price) || 0.0,
        category_id: parseInt(category_id),
        is_available: parseInt(is_available),
        is_featured: parseInt(is_featured)
      };

      // If a new image was uploaded via multer, add it to the data
      if (req.file) {
        data.image_url = `/uploads/${req.file.filename}`;
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
