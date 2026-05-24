import React from 'react';
import { AlertCircle, Activity } from 'lucide-react';

const InventoryReport = ({ data }) => {
  const lowStockCount = data?.low_stock_count || 0;
  const lowStockList = data?.low_stock_list || "All levels healthy";
  const usageData = data?.inventory_usage || [];

  const formatCurrency = (num) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);

  if (!data) return null;

  return (
    <div className="w-100 mt-">
      {/* HEADER SECTION - Independent and clear */}
      <div className="mb-4 px-1 pb-3 border-bottom">
        <h4 className="fw-bold text-dark mb-1 fs-3">Inventory Report</h4>
        <p className="text-muted small mb-0">Real-time stock & consumption tracking</p>
      </div>    

      {/* SINGLE ROW FOR ALL CARDS */}
      <div className="row g-3 g-md-4">
        
        {/* LEFT COLUMN */}
        <div className="col-12 col-md-4"> 
          <div className={`card border-0 shadow-sm rounded-4 border-start border-4 h-100 ${lowStockCount > 0 ? 'border-danger' : 'border-success'}`}>
            <div className="card-body p-44 p-md-4">
              <div className="d-flex align-items-center gap-3">
                <div className={`p-3 rounded-circle ${lowStockCount > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold x-small text-uppercase text-muted">Low Stock Alerts</h6>
                  <h3 className={`mb-0 fw-bold ${lowStockCount > 0 ? 'text-danger' : 'text-success'}`}>
                    {lowStockCount} Items
                  </h3>
                </div>
              </div>
              <div className="mt-3">
                 <p className="small text-muted mb-0 lh-sm">
                   <span className="fw-bold text-dark">Critical: </span>
                   {lowStockCount > 0 ? lowStockList : "No items need reordering"}
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-12 col-md-8">
          <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
            <div className="card-body p-3 p-md-4">
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <Activity size={18} className="me-2 text-primary"/> Consumption Rate (Weekly)
              </h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr className="x-small text-uppercase text-muted">
                      <th className="border-0 ps-2">Ingredient</th>
                      <th className="border-0 d-none d-lg-table-cell">Starting</th>
                      <th className="border-0">Used</th>
                      <th className="border-0">Ending</th>
                      <th className="text-end pe-2 border-0">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.length > 0 ? usageData.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 fw-bold text-dark small ps-2">{item.name}</td>
                        <td className="text-muted small d-none d-lg-table-cell">{item.starting_stock}{item.unit}</td>
                        <td className="small">{item.used_stock}{item.unit}</td>
                        <td>
                          <span className={`badge ${item.current_stock < 10 ? 'bg-danger' : 'bg-light text-dark'} border x-extra-small`}>
                              {item.current_stock}{item.unit}
                          </span>
                        </td>
                        <td className="fw-bold text-end pe-2 text-dark small">{formatCurrency(item.inventory_value)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="text-center py-4 text-muted">No inventory data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .x-small { font-size: 0.75rem; }
        .x-extra-small { font-size: 0.65rem; }
        @media (max-width: 375px) {
           h3 { font-size: 1.4rem; }
           .table td, .table th { padding-left: 0.25rem; padding-right: 0.25rem; }
           .card-body { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default InventoryReport;