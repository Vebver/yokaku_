import React from 'react';

const Billing = () => {
  // Sample data - in a real app, this might come from an API or props
  const invoiceData = [
    { id: 101, date: 'Oct 11, 2023', customer: 'John Doe', amount: 1250.00, status: 'Paid' },
    { id: 102, date: 'Oct 12, 2023', customer: 'Jane Smith', amount: 850.50, status: 'Pending' },
    { id: 103, date: 'Oct 13, 2023', customer: 'Acme Corp', amount: 2100.00, status: 'Paid' },
    { id: 104, date: 'Oct 14, 2023', customer: 'Global Tech', amount: 540.25, status: 'Pending' },
  ];

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Billing & Invoices</h2>
        <button className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Create Invoice
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted">
              <tr>
                <th className="ps-4">Invoice ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.map((item) => (
                <tr key={item.id}>
                  <td className="ps-4 fw-medium text-primary">#INV-{item.id}</td>
                  <td>{item.date}</td>
                  <td>{item.customer}</td>
                  <td className="fw-bold">${item.amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge rounded-pill ${
                      item.status === 'Paid' 
                        ? 'bg-success-subtle text-success' 
                        : 'bg-warning-subtle text-warning'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-light border me-2" title="View">
                      <i className="bi bi-eye"></i>
                    </button>
                    <button className="btn btn-sm btn-light border" title="Download">
                      <i className="bi bi-download"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-white py-3">
          <small className="text-muted">Showing {invoiceData.length} recent transactions</small>
        </div>
      </div>
    </div>
  );
};

export default Billing;