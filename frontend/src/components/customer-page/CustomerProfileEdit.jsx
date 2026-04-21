import React, { useState } from 'react';

const CustomerProfileEdit = ({ userData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    phone: userData.phone || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); 
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <form onSubmit={handleSubmit} className="card shadow-lg border-0 rounded-4 overflow-hidden">
            
            {/* Header Section */}
            <div className="bg-dark text-white text-center py-5 position-relative">
              <div className="position-relative d-inline-block mb-3">

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
                <label className="form-label text-muted fw-semibold small d-flex align-items-center">
                  <i className="bi bi-person-fill me-2 text-warning"></i> First Name
                </label>
                <input 
                  type="text" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Last Name */}
              <div className="mb-3">
                <label className="form-label text-muted fw-semibold small d-flex align-items-center">
                  <i className="bi bi-person-badge-fill me-2 text-warning"></i> Last Name
                </label>
                <input 
                  type="text" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email Address */}
              <div className="mb-3">
                <label className="form-label text-muted fw-semibold small d-flex align-items-center">
                  <i className="bi bi-envelope-at-fill me-2 text-warning"></i> Email Address
                </label>
                <input 
                  type="email" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm border-start border-warning border-4"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold small d-flex align-items-center">
                  <i className="bi bi-telephone-fill me-2 text-warning"></i> Phone Number
                </label>
                <input 
                  type="tel" 
                  className="form-control border-0 bg-light fw-bold py-2 shadow-sm"
                  name="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-warning fw-bold py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
                  <i className="bi bi-check-circle-fill me-2"></i> Save Changes
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary fw-bold py-2 rounded-3 d-flex align-items-center justify-content-center"
                  onClick={onCancel}
                >
                  <i className="bi bi-arrow-left-short fs-5 me-1"></i> Cancel
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