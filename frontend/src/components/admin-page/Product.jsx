import React from 'react';
import '../../Style/AdminDashboard.css'; // Shared styles

// Mock POS data (can fetch from API later)
const products = [
  { id: 1, name: 'Margherita Pizza', category: 'Pizza', price: 12.99, stock: 50 },
  { id: 2, name: 'Ramen Bowl', category: 'Noodles', price: 14.50, stock: 30 },
  { id: 3, name: 'Chicken Wings', category: 'Appetizers', price: 8.99, stock: 75 },
];

function Product() {
  return (
    <div className="section-content">
      <div className="admin-header">
        <h1 className="section-title">Products</h1>
        <button className="btn btn-primary">+ Add Product</button>
      </div>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>${product.price}</td>
                <td>{product.stock}</td>
                <td>
                  <button className="btn btn-primary" style={{ marginRight: '0.5rem' }}>Edit</button>
                  <button className="btn btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Product;

