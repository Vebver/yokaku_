import React from 'react';
import '../../Style/AdminDashboard.css'; // Shared styles

function Profile() {
  return (
    <div className="section-content">
      <h1 className="section-title">Profile & Settings</h1>
      <div className="card">
        <h3>Admin Profile</h3>
        <form style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
          <div>
            <label>Name</label>
            <input type="text" defaultValue="Admin User" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" defaultValue="admin@yokaku.com" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <button type="submit" className="btn btn-primary">Update Profile</button>
        </form>
      </div>
    </div>
  );
}

export default Profile;

