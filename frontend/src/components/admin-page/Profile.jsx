import React, { useState } from 'react';

function Profile() {
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@yokaku.com',
    role: 'Super Admin',
    phone: '+1 (555) 000-1234'
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Profile updated successfully!");
    }, 1000);
  };

  return (
    <div className="container-fluid fade-in">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-0">Profile & Settings</h2>
        <p className="text-muted">Manage your account information and security preferences</p>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile Card */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <div className="mb-3">
              <img 
                src={`https://ui-avatars.com/api/?name=${profile.name}&background=10b981&color=fff&size=128`} 
                alt="Admin Avatar" 
                className="rounded-circle shadow-sm border border-4 border-white"
                width="120"
              />
            </div>
            <h4 className="fw-bold mb-1">{profile.name}</h4>
            <p className="text-muted small mb-3">{profile.role}</p>
            <div className="d-grid">
              <button className="btn btn-outline-primary btn-sm">Change Photo</button>
            </div>
            <hr className="my-4 text-muted opacity-25" />
            <div className="text-start">
              <h6 className="fw-bold small text-uppercase text-muted mb-3">Account Status</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small">Verification</span>
                <span className="badge bg-success-subtle text-success">Verified</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small">Member Since</span>
                <span className="text-muted small">Oct 2023</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="col-lg-8">
          {/* Personal Information */}
          <div className="card border-0 shadow-sm p-4 mb-4">
            <h5 className="fw-bold mb-4">Personal Information</h5>
            <form onSubmit={handleUpdate}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Role</label>
                  <input type="text" className="form-control bg-light" value={profile.role} readOnly />
                </div>
              </div>
              <div className="mt-4">
                <button type="submit" className="btn btn-primary px-4" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security / Password */}
          <div className="card border-0 shadow-sm p-4">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-danger-subtle text-danger p-2 rounded me-3">
                <i className="bi bi-shield-lock fs-5"></i>
              </div>
              <h5 className="fw-bold mb-0">Security Settings</h5>
            </div>
            <form>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Current Password</label>
                  <input type="password" size="1" className="form-control" placeholder="••••••••" />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">New Password</label>
                  <input type="password" size="1" className="form-control" />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Confirm New Password</label>
                  <input type="password" size="1" className="form-control" />
                </div>
              </div>
              <div className="mt-4 d-flex justify-content-between align-items-center">
                <button type="button" className="btn btn-outline-danger btn-sm">Update Password</button>
                <a href="#" className="small text-decoration-none">Forgot Password?</a>
              </div>
            </form>
          </div>

          {/* Preferences */}
          <div className="card border-0 shadow-sm p-4 mt-4">
            <h5 className="fw-bold mb-3">System Preferences</h5>
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="notifySwitch" defaultChecked />
              <label className="form-check-input-label ms-2" htmlFor="notifySwitch">Receive email alerts for new orders</label>
            </div>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="themeSwitch" />
              <label className="form-check-input-label ms-2" htmlFor="themeSwitch">Enable Dark Mode (Beta)</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;