// Simple frontend controller example for Vue

// API base URL
const API_URL = 'http://localhost:3000/api'

// Fetch all items
export const getAllItems = async () => {
  try {
    const response = await fetch(`${API_URL}/items`)
    return await response.json()
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

// Fetch item by ID
export const getItemById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/items/${id}`)
    return await response.json()
  } catch (error) {
    console.error('Error fetching item:', error)
    throw error
  }
}

// Create new item
export const createItem = async (itemData) => {
  try {
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    })
    return await response.json()
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

// Update item
export const updateItem = async (id, itemData) => {
  try {
    const response = await fetch(`${API_URL}/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    })
    return await response.json()
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

// Delete item
export const deleteItem = async (id) => {
  try {
    const response = await fetch(`${API_URL}/items/${id}`, {
      method: 'DELETE'
    })
    return await response.json()
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

