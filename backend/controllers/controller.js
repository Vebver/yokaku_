// Simple controller example for backend

// Example controller functions
const getAllItems = (req, res) => {
  // Logic to get all items
  res.json({ message: 'Get all items' })
}

const getItemById = (req, res) => {
  const { id } = req.params
  // Logic to get item by ID
  res.json({ message: `Get item with ID: ${id}` })
}

const createItem = (req, res) => {
  // Logic to create new item
  res.status(201).json({ message: 'Item created' })
}

const updateItem = (req, res) => {
  const { id } = req.params
  // Logic to update item
  res.json({ message: `Item ${id} updated` })
}

const deleteItem = (req, res) => {
  const { id } = req.params
  // Logic to delete item
  res.json({ message: `Item ${id} deleted` })
}

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
}

