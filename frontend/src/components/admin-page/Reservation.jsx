import React, { useState } from 'react';

const Reservations = () => {
  // Simulated Web Inquiry Data
  const [inquiries, setInquiries] = useState([
    { 
      id: 1, 
      name: "John Doe", 
      email: "john@example.com", 
      type: "Table Booking", 
      date: "2023-11-25", 
      time: "07:30 PM", 
      status: "Pending" 
    },
    { 
      id: 2, 
      name: "Alice Smith", 
      email: "alice.s@web.com", 
      type: "General Inquiry", 
      date: "2023-11-24", 
      time: "11:15 AM", 
      status: "Confirmed" 
    },
    { 
      id: 3, 
      name: "Bob Wilson", 
      email: "bob@gmail.com", 
      type: "Event Space", 
      date: "2023-12-01", 
      time: "02:00 PM", 
      status: "Urgent" 
    },
  ]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending': return 'bg-warning text-dark';
      case 'Confirmed': return 'bg-success';
      case 'Urgent': return 'bg-danger text-white';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Reservations</h2>
          <p className="text-muted small">Manage incoming inquiries from your web platform.</p>
        </div>
        <button className="btn btn-primary shadow-sm">
          <i className="bi bi-plus-lg me-2"></i>New Entry
        </button>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4 py-3">Customer</th>
                <th className="py-3">Category</th>
                <th className="py-3">Date & Time</th>
                <th className="py-3">Status</th>
                <th className="text-end pe-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((item) => (
                <tr key={item.id} className="border-bottom">
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <div className="avatar me-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                        <i className="bi bi-person text-primary"></i>
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{item.name}</div>
                        <div className="text-muted small">{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">{item.type}</span>
                  </td>
                  <td>
                    <div className="fw-bold">{item.date}</div>
                    <div className="text-muted small">{item.time}</div>
                  </td>
                  <td>
                    <span className={`badge rounded-pill ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="btn-group">
                      <button className="btn btn-sm btn-outline-secondary" title="View Details">
                        <i className="bi bi-eye"></i> View
                      </button>
                      <button className="btn btn-sm btn-outline-success" title="Approve">
                        <i className="bi bi-check-lg"></i> Approve
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Delete">
                        <i className="bi bi-trash"></i> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reservations;