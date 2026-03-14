import React from 'react';
import '../../Style/AdminDashboard.css'; // Shared styles

const categories = ['Pizza', 'Noodles', 'Appetizers', 'Desserts', 'Drinks'];

function Categories() {
  return (
    <div className="section-content">
      <h1 className="section-title">Categories</h1>
      <button className="btn btn-primary" style={{ marginBottom: '1rem' }}>+ Add Category</button>
      <ul style={{ listStyle: 'none' }}>
        {categories.map((cat, idx) => (
          <li key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {cat}
            <div>
              <button className="btn btn-primary" style={{ marginRight: '0.5rem' }}>Edit</button>
              <button className="btn btn-danger">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Categories;

