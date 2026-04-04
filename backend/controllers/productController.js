const Product = require('../models/Product');

const productController = {
  getProducts: async (req, res) => {
    try {
      const products = await Product.getAll();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      // 1. Get text fields from req.body
      const { name, description, price, category_id, is_available } = req.body;

      // 2. Construct the Image URL from req.file (provided by Multer)
      // This creates a string like: http://localhost:5000/uploads/171234567.png
      const image_url = req.file 
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` 
        : null;

      // 3. Assemble the data for the Model
      const productData = {
        name,
        description,
        price,
        category_id,
        is_available,
        image_url
      };

      // 4. Send to the Model
      const newProduct = await Product.create(productData);
      res.status(201).json(newProduct);
    } catch (error) {
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
  }
};

module.exports = productController;