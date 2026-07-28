const { get } = require('node:http');
const Category = require('../models/Category');
const { logActivity } = require("../utils/logger");

const categoryController = {
  getCategories: async (req, res) => {
    try {
      const categories = await Category.getAll();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  createCategory: async (req, res) => {
    try {
      const newCategory = await Category.create(req.body);
      
      await logActivity(
        req.user?.userId || null,
        "CREATE_CATEGORY",
        newCategory?.category_id || newCategory?.id || null,
        { category_name: req.body.category_name },
        req,
      );

      res.status(201).json(newCategory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      await logActivity(
        req.user?.userId || null,
        "DELETE_CATEGORY",
        req.params.id,
        { message: "Category deleted permanently" },
        req,
      );

      await Category.delete(req.params.id);
      res.json({ message: "Category deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = categoryController;
