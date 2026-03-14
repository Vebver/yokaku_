import React, { useState } from 'react';
import '../../Style/AdminDashboard.css';
import '../../Style/Navbar.css';

// Simple SVG icons for sidebar (POS style)
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
);

const ProductsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const CategoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 18h5v-6h-5v6zm-6 0h5V5H4v13zm12 0h5v-6h-5v6zM10 5v6h11V5H10z"/>
  </svg>
);

const SalesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.5L9 14l-4 5h12z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  // No login – direct dashboard access as requested
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'products', label: 'Products', icon: ProductsIcon },
    { id: 'categories', label: 'Categories', icon: CategoryIcon },
    { id: 'sales', label: 'Sales', icon: SalesIcon },
    { id: 'profile', label: 'Profile & Settings', icon: ProfileIcon },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="section-content">
            <h1 className="section-title">Dashboard Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr)', gap: '1rem' }}>
              <div className="card">
                <h3>Total Sales</h3>
                <p style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold' }}>$12,450</p>
              </div>
              <div className="card">
                <h3>Products</h3>
                <p style={{ fontSize: '2rem', color: '#3b82f6', fontWeight: 'bold' }}>156</p>
              </div>
              <div className="card">
                <h3>Orders Today</h3>
                <p style={{ fontSize: '2rem', color: '#f59e0b', fontWeight: 'bold' }}>42</p>
              </div>
            </div>
          </div>
        );
      case 'products':
        return (
          <div className="section-content">
            <h1 className="section-title">Products</h1>
            <div className="admin-header">
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
                  <tr>
                    <td>1</td>
                    <td>Margherita Pizza</td>
                    <td>Pizza</td>
                    <td>$12.99</td>
                    <td>50</td>
                    <td>
                      <button className="btn btn-primary">Edit</button>
                      <button className="btn btn-danger">Delete</button>
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Ramen Bowl</td>
                    <td>Noodles</td>
                    <td>$14.50</td>
                    <td>30</td>
                    <td>
                      <button className="btn btn-primary">Edit</button>
                      <button className="btn btn-danger">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'categories':
        return (
          <div className="section-content">
            <h1 className="section-title">Categories</h1>
            <button className="btn btn-primary">+ Add Category</button>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                Pizza
                <div>
                  <button className="btn btn-primary" style={{ marginRight: '0.5rem' }}>Edit</button>
                  <button className="btn btn-danger">Delete</button>
                </div>
              </li>
              <li className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                Noodles
                <div>
                  <button className="btn btn-primary" style={{ marginRight: '0.5rem' }}>Edit</button>
                  <button className="btn btn-danger">Delete</button>
                </div>
              </li>
            </ul>
          </div>
        );
      case 'sales':
        return (
          <div className="section-content">
            <h1 className="section-title">Sales</h1>
            <div className="card">
              <div className="sales-chart">
                Sales Chart Placeholder
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="section-content">
            <h1 className="section-title">Profile & Settings</h1>
            <form style={{ maxWidth: '400px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Name</label>
                <input type="text" defaultValue="Admin User" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '0.25rem' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Email</label>
                <input type="email" defaultValue="admin@yokaku.com" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '0.25rem' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Update</button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
            >
              <item.icon />
              {item.label}
            </a>
          ))}
        </div>
      </nav>
      <main className="admin-main">
        {renderSection()}
      </main>
    </div>
  );
}

export default AdminDashboard;

