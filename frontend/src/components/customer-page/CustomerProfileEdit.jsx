import React, { useState } from 'react';

const CustomerProfileEdit = ({ userData, onSave, onCancel }) => {
  // Initialize form state with existing user data
  const [formData, setFormData] = useState({
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    phone: userData.phone || '',
    profileImage: userData.profileImage || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); // Parent function to handle the API update
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <form onSubmit={handleSubmit} className="card shadow-lg border-0 rounded-4 overflow-hidden">
            
            {/* Header Section (Matching Original) */}
            <div className="bg-dark text-white text-center py-5 position-relative">
              <div className="position-relative d-inline-block mb-3">
                <img
                  src={formData.profileImage || "/customer-avatar.jpg"} 
                  alt="Customer"
                  className="rounded-circle border border-4 border-warning shadow"
                  style={{ width: '130px', height: '130px', objectFit: 'cover' }}
                />
                <label 
                  htmlFor="imageUpload" 
                  className="position-absolute bottom-0 end-0 bg-warning rounded-circle p-2 shadow-sm" 
                  style={{ cursor: 'pointer', border: '2px solid #212529' }}
                >
                  <i className="bi bi-camera-fill text-dark"></i>
                  <input type="file" id="imageUpload" hidden />
                </label>
              </div>
              <h2 className="fw-bold mb-1">Edit Profile</h2>
              <p className="text-warning mb-0 small text-uppercase fw-bold">
                Update your personal details
              </p>
            </div>

            {/* Form Section */}
            <div className="card-body p-4 p-md-5">
              <h5 className="text-muted text-uppercase mb-4 small fw-bold border-bottom pb-2">
                Personal Information
              </h5>
              
              {/* First Name */}
              <div className="mb-3">
                <label className="form-label text-muted fw-semibold small">First Name</label>
                <input 
                  type="text" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>

              {/* Last Name */}
              <div className="mb-3">
                <label className="form-label text-muted fw-semibold small">Last Name</label>
                <input 
                  type="text" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>

              {/* Email Address */}
              <div className="mb-3">
                <label className="form-label text-muted fw-semibold small">Email Address</label>
                <input 
                  type="email" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm border-start border-warning border-4"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Phone Number */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold small">Phone Number</label>
                <input 
                  type="tel" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-warning fw-bold py-2 rounded-3 shadow-sm">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary fw-bold py-2 rounded-3"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileEdit;