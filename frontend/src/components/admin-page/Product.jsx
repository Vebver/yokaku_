import React, { useState } from 'react';

function Product() {
  // 1. State for Product List (Initial Mock Data)
  const [products, setProducts] = useState([
    { id: 1, name: 'Margherita Pizza', category: 'Pizza', price: 12.99, stock: 50 },
    { id: 2, name: 'Ramen Bowl', category: 'Noodles', price: 14.50, stock: 30 },
    { id: 3, name: 'Chicken Wings', category: 'Appetizers', price: 8.99, stock: 75 },
  ]);

  // 2. State for Form Inputs
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Pizza', // Default category
    price: '',
    stock: ''
  });

  // 3. Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  // 4. Add Product Logic
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return alert("Please fill in required fields");

    const productToAdd = {
      id: products.length + 1,
      ...newProduct,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock) || 0
    };

    setProducts([...products, productToAdd]);
    
    // Reset form and close modal (using Bootstrap data attributes)
    setNewProduct({ name: '', category: 'Pizza', price: '', stock: '' });
    
    // Close modal manually if not using data-bs-dismiss
    const modalElement = document.getElementById('addProductModal');
    const modal = window.bootstrap.Modal.getInstance(modalElement);
    if(modal) modal.hide();
  };

  // 5. Delete Product
  const deleteProduct = (id) => {
    if (window.confirm("Delete this product?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="container-fluid fade-in">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Menu Management</h2>
          <p className="text-muted">Add or edit edible products and inventory</p>
        </div>
        <button 
          className="btn btn-primary px-4 shadow-sm" 
          data-bs-toggle="modal" 
          data-bs-target="#addProductModal"
        >
          <i className="bi bi-plus-lg me-2"></i>Add New Item
        </button>
      </div>

      {/* Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted">
              <tr>
                <th className="ps-4">ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="ps-4 text-muted">#{product.id}</td>
                  <td>
                    <div className="fw-bold">{product.name}</div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">{product.category}</span>
                  </td>
                  <td className="fw-bold text-success">${product.price.toFixed(2)}</td>
                  <td>
                    {product.stock > 10 ? (
                      <span className="text-success"><i className="bi bi-check-circle-fill me-1"></i> {product.stock} in stock</span>
                    ) : (
                      <span className="text-danger fw-bold"><i className="bi bi-exclamation-triangle-fill me-1"></i> Only {product.stock} left</span>
                    )}
                  </td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-primary me-2"><i className="bi bi-pencil"></i> Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteProduct(product.id)}><i className="bi bi-trash"></i> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD PRODUCT MODAL --- */}
      <div className="modal fade" id="addProductModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pt-4 px-4">
              <h5 className="modal-title fw-bold">Add New Edible Product</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Product Name</label>
                  <input 
                    type="text" 
                    name="name"
                    className="form-control" 
                    placeholder="e.g. Pepperoni Pizza"
                    value={newProduct.name}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">Category</label>
                    <select 
                      name="category"
                      className="form-select" 
                      value={newProduct.category}
                      onChange={handleInputChange}
                    >
                      <option value="Pizza">Pizza</option>
                      <option value="Noodles">Noodles</option>
                      <option value="Appetizers">Appetizers</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">Price ($)</label>
                    <input 
                      type="number" 
                      name="price"
                      step="0.01" 
                      className="form-control" 
                      placeholder="0.00"
                      value={newProduct.price}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Initial Stock Level</label>
                  <input 
                    type="number" 
                    name="stock"
                    className="form-control" 
                    placeholder="e.g. 50"
                    value={newProduct.stock}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer border-top-0 pb-4 px-4">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary px-4">Add to Menu</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Product;