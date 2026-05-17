import React from 'react';
import { ArrowDown, Award, TrendingUp } from 'lucide-react';

const ProductPerformance = ({ data }) => {
  // 1. Extract data from props
  const topProducts = data?.top_selling_products || [];
  const slowMoving = data?.slow_moving_products || [];

  // Format currency helper
  const formatCurrency = (num) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);

  if (!data) return null;

  return (
    <div className="row g-3 g-md-4 mt-1">
      <div className="col-12">
        <h4 className="fw-bold mb-1 fs-3 fs-md-4">Product Performance</h4>
        <p className="text-muted small">Insights into your menu's popularity</p>
      </div>

      {/* --- TOP SELLERS --- */}
      <div className="col-12 col-lg-7">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0">
                <Award className="me-2 text-primary" size={18}/>Top 5 Best Sellers
              </h6>
              <TrendingUp size={16} className="text-success d-none d-sm-block" />
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0" style={{ minWidth: '280px' }}>
                <thead className="table-light">
                  <tr className="x-small text-uppercase text-muted">
                    <th className="ps-0 border-0">Item</th>
                    <th className="border-0">Sold</th>
                    <th className="text-end pe-0 border-0">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length > 0 ? (
                    topProducts.map((p, i) => (
                      <tr key={i}>
                        <td className="ps-0 py-3">
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '140px' }}>
                            {p.name}
                          </div>
                          <span className={`badge ${i === 0 ? 'bg-primary' : 'bg-light text-dark'} x-extra-small border`}>
                            {i === 0 ? 'TOP' : 'Trending'}
                          </span>
                        </td>
                        <td className="small">{p.total_sold}</td>
                        <td className="fw-bold text-end pe-0 text-primary small">
                          {formatCurrency(p.total_revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="text-center py-4 text-muted">No sales data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- SLOW MOVING ITEMS --- */}
      <div className="col-12 col-lg-5">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body p-3 p-md-4">
            <h6 className="fw-bold mb-3 text-danger">
              <ArrowDown className="me-2" size={18}/>Slow Moving Items
            </h6>
            <div className="list-group list-group-flush">
              {slowMoving.length > 0 ? (
                slowMoving.map((item, idx) => (
                  <div key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-0 border-bottom-dashed">
                    <div>
                        <div className="small text-dark fw-bold">{item.name}</div>
                        <div className="text-muted x-extra-small text-uppercase">Monthly Performance</div>
                    </div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2">
                      {item.total_sold} sold
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                    <p className="text-muted small">All items are performing well!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .x-extra-small { font-size: 0.65rem; }
        .border-bottom-dashed { border-bottom: 1px dashed #e9ecef !important; }
        
        /* iPhone SE optimizations */
        @media (max-width: 375px) {
           .card-body { padding: 1rem !important; }
           .badge { font-size: 0.7rem; }
           .table td { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default ProductPerformance;