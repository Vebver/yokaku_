import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../Style/CustomerProfile.css';

const CustomerProfile = ({ user }) => {
  // Sample Data
  const userData = user || {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+63 912 345 6789",
    customerId: "HG-2024-8891",
    status: "Active Customer"
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          
          {/* Main Profile Card */}
          <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
            
            {/* Header Section (Black Background) */}
            <div className="bg-dark text-white text-center py-5">
              <div className="position-relative d-inline-block mb-3">
                <img
                  src="/customer-avatar.jpg"
                  alt="Customer"
                  className="rounded-circle border border-4 border-warning shadow"
                  style={{ width: '130px', height: '130px', objectFit: 'cover' }}
                />
              </div>
              <h2 className="fw-bold mb-1">
                {userData.firstName} {userData.lastName}
              </h2>
              <p className="text-warning mb-0 small text-uppercase fw-bold">
                {userData.status}
              </p>
            </div>

            {/* Information Section */}
            <div className="card-body p-4 p-md-5">
              <h5 className="text-muted text-uppercase mb-4 small fw-bold border-bottom pb-2">
                Personal Information
              </h5>
              
              <div className="row mb-3">
                <div className="col-sm-4 text-muted fw-semibold">Customer ID</div>
                <div className="col-sm-8 fw-bold">{userData.customerId}</div>
              </div>

              <div className="row mb-3">
                <div className="col-sm-4 text-muted fw-semibold">Email Address</div>
                <div className="col-sm-8 fw-bold text-break">{userData.email}</div>
              </div>

              <div className="row mb-4">
                <div className="col-sm-4 text-muted fw-semibold">Phone Number</div>
                <div className="col-sm-8 fw-bold">{userData.phone}</div>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button className="btn btn-warning fw-bold py-2 rounded-3">
                  Edit Profile
                </button>
                <button className="btn btn-outline-dark fw-bold py-2 rounded-3">
                  Account Settings
                </button>
              </div>
            </div>

          </div> {/* End Card */}

        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;