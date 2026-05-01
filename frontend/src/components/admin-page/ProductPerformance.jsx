import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Star, ArrowDown, Award } from 'lucide-react';

const ProductPerformance = () => {
  const topProducts = [
    { name: 'Buffalo Wings', sales: 240, revenue: 12000, status: 'Best Seller' },
    { name: 'Cheesy Burger', sales: 180, revenue: 9000, status: 'Trending' },
  ];

  return (
    <div className="row g-4 mt-1">
      <div className="col-md-7">
        <div className="card border-0 shadow-sm p-4">
          <h6 className="fw-bold mb-3"><Award className="me-2" size={18}/>Top 5 Best Sellers</h6>
          <table className="table align-middle">
            <thead className="table-light">
              <tr><th>Item</th><th>Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.name}</strong><br/><small className="badge bg-success-subtle text-success">{p.status}</small></td>
                  <td>{p.sales}</td>
                  <td className="fw-bold">₱{p.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-md-5">
        <div className="card border-0 shadow-sm p-4 h-100">
          <h6 className="fw-bold mb-3 text-danger"><ArrowDown className="me-2" size={18}/>Slow Moving Items</h6>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">Vegetable Salad <small className="text-muted">2 sold this month</small></li>
            <li className="list-group-item d-flex justify-content-between">Hot Choco <small className="text-muted">5 sold this month</small></li>
          </ul>
          <div className="mt-4 p-3 bg-light rounded">
            <small className="fw-bold"><Star size={14} className="text-warning me-1"/> Featured Impact</small>
            <p className="small mb-0 mt-1">Items marked as 'Featured' saw a <strong>22% increase</strong> in orders this month.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPerformance;