import React from 'react';
import { AlertCircle, Package, Activity } from 'lucide-react';

const InventoryReport = () => {
  return (
    <div className="row g-4 mt-1">
      <div className="col-md-4">
        <div className="card border-0 shadow-sm p-4 border-start border-danger border-4">
          <div className="d-flex align-items-center gap-3">
            <AlertCircle size={40} className="text-danger" />
            <div>
              <h6 className="mb-0 fw-bold text-danger">Low Stock Alerts</h6>
              <h3 className="mb-0">8 Items</h3>
            </div>
          </div>
          <small className="text-muted mt-2">Immediate reorder required: Chicken, Buns, Soda</small>
        </div>
      </div>

      <div className="col-md-8">
        <div className="card border-0 shadow-sm p-4">
          <h6 className="fw-bold mb-3"><Activity size={18} className="me-2"/>Consumption Rate (Weekly)</h6>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Ingredient</th><th>Starting</th><th>Used</th><th>Ending</th><th>Value</th></tr></thead>
              <tbody>
                <tr><td>Chicken Wings</td><td>100kg</td><td>85kg</td><td>15kg</td><td>₱25,500</td></tr>
                <tr><td>Beef Patties</td><td>50kg</td><td>40kg</td><td>10kg</td><td>₱12,000</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;