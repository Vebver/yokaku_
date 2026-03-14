import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../Style/AdminDashboard.css';
import '../../Style/Navbar.css';

// SVG icons (same as before)
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
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.5L9 14l-4 5h12z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Check ANY login token (shared login) - no re-login required
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
      setLoginError('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    axios.defaults.headers.common['Authorization'] = '';
    setIsAuthenticated(false);
    setActiveSection('dashboard');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'products', label: 'Products', icon: ProductsIcon },
    { id: 'categories', label: 'Categories', icon: CategoryIcon },
    { id: 'sales', label: 'Sales', icon: SalesIcon },
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
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
        return <div className="section-content"><h1 className="section-title">Products</h1><p>Product table coming soon</p></div>;
      case 'categories':
        return <div className="section-content"><h1 className="section-title">Categories</h1><p>Categories list</p></div>;
      case 'sales':
        return <div className="section-content"><h1 className="section-title">Sales</h1><p>Sales charts</p></div>;
      case 'profile':
        return <div className="section-content"><h1 className="section-title">Profile</h1><p>Settings form</p></div>;
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        backgroundColor: '#f8fafc',
        padding: '2rem',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '3rem', 
          borderRadius: '12px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
          textAlign: 'center',
          minWidth: '350px'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#111827' }}>Admin Login Required</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
            Please login from the main page first.
          </p>
          <button 
            onClick={() => window.location.href = '/'} 
            style={{ 
              padding: '0.75rem 2rem', 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: '500', 
              cursor: 'pointer'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <button onClick={handleLogout} className="btn" style={{ marginLeft: 'auto', marginRight: '2rem' }}>
          Logout
        </button>
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

