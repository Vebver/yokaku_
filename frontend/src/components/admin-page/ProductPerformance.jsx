import React, { useState } from 'react';
import { ArrowDown, Award, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductPerformance = ({ data }) => {
  const topProducts = data?.top_selling_products || [];
  const slowMoving = data?.slow_moving_products || [];

  // --- LOCAL PAGINATION STATE ---
  const [slowPage, setSlowPage] = useState(1);
  const itemsPerPage = 6;
  const totalSlowPages = Math.ceil(slowMoving.length / itemsPerPage);
  
  const indexOfLastItem = slowPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSlowItems = slowMoving.slice(indexOfFirstItem, indexOfLastItem);

  const formatCurrency = (num) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);

  if (!data) return null;

  return (
     <div className="w-100">
      <div className="mb-4 px-1 pb-3 border-bottom">
        <h4 className="fw-bold text-dark mb-1 fs-3 fs-md-4">Product Performance</h4>
        <p className="text-muted small">Insights into your menu's popularity</p>
      </div>

      <div className="row g-3 g-md-4">
        {/* --- TOP SELLERS --- */}
        <div className="col-12 col-lg-5 pb-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 pb-3">
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

        {/* --- SLOW MOVING ITEMS WITH PAGINATION --- */}
        <div className="col-12 col-lg-7 pb-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column">
            <div className="card-body p-3 p-md-4 flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-danger">
                  <ArrowDown className="me-2" size={18}/>Slow Moving
                </h6>
                {/* Micro-pagination controls */}
                <div className="d-flex gap-1">
                   <button 
                    className="btn btn-light btn-sm p-1 border shadow-none" 
                    disabled={slowPage === 1}
                    onClick={() => setSlowPage(p => p - 1)}
                   >
                     <ChevronLeft size={14} />
                   </button>
                   <button 
                    className="btn btn-light btn-sm p-1 border shadow-none" 
                    disabled={slowPage >= totalSlowPages}
                    onClick={() => setSlowPage(p => p + 1)}
                   >
                     <ChevronRight size={14} />
                   </button>
                </div>
              </div>

              <div className="list-group list-group-flush" style={{ minHeight: '350px' }}>
                {currentSlowItems.length > 0 ? (
                  currentSlowItems.map((item, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom-dashed">
                      <div className="text-truncate me-2">
                          <div className="small text-dark fw-bold text-truncate" style={{ maxWidth: '150px' }}>{item.name}</div>
                          <div className="text-muted x-extra-small text-uppercase">Monthly Performance</div>
                      </div>
                      <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-1 x-small flex-shrink-0">
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
            
            {/* Page indicator at the bottom */}
            <div className="card-footer bg-transparent border-0 px-4 pb-3">
               <div className="text-center text-muted x-extra-small text-uppercase">
                 Page {slowPage} of {totalSlowPages || 1}
               </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .x-small { font-size: 0.75rem; letter-spacing: 0.5px; }
        .x-extra-small { font-size: 0.65rem; }
        .border-bottom-dashed { border-bottom: 1px dashed #e9ecef !important; }
        
        @media (max-width: 375px) {
           .card-body { padding: 1rem !important; }
           .badge { font-size: 0.7rem; }
        }
      `}</style>
    </div>
  );
};

export default ProductPerformance;