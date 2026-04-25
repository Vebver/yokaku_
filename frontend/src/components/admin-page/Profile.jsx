import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Profile() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    status: '',
    memberSince: '',
    customerId: null
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. FETCH PROFILE ON LOAD
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // 2. HANDLE UPDATE
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put("/api/profile", profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data); // Update local state with fresh data from server
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Error updating profile: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-5 text-center">Loading Profile Data...</div>;

  return (
    <div className="container-fluid fade-in">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">Profile & Settings</h2>
        <p className="text-muted small">Manage your account information</p>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile Card */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm text-center p-4">
            <div className="mb-3">
              <img 
                src={`https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=10b981&color=fff&size=128`} 
                alt="Avatar" 
                className="rounded-circle shadow-sm border border-4 border-white"
                width="120"
              />
            </div>
            <h4 className="fw-bold mb-1">{profile.firstName} {profile.lastName}</h4>
            <p className="text-muted small mb-1">Admin</p>
            {profile.customerId && (
                <span className="badge bg-light text-dark border mb-3">{profile.customerId}</span>
            )}
            
            <hr className="my-4 text-muted opacity-25" />
            
            <div className="text-start">
              <h6 className="fw-bold small text-uppercase text-muted mb-3">Account Details</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small">Role</span>
                <span className="text-primary small fw-bold">{profile.role}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small">Member Since</span>
                <span className="text-muted small">
                    {new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm p-4 mb-4">
            <h5 className="fw-bold mb-4">Personal Information</h5>
            <form onSubmit={handleUpdate}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">First Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.firstName || ''}
                    onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Last Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.lastName}
                    onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button type="submit" className="btn btn-primary px-4" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security / Password (Logic can be added later) */}
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
                  <label className="form-label small fw-bold">New Password</label>
                  <input type="password" fix="1" className="form-control" placeholder="Optional" />
                </div>
              </div>
              <div className="mt-4">
                <button type="button" className="btn btn-outline-danger btn-sm">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;