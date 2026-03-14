import React from 'react';
import '../../Style/AdminDashboard.css'; // Shared styles

function Sales() {
  return (
    <div className="section-content">
      <h1 className="section-title">Sales Analytics</h1>
      <div className="card">
        <div className="sales-chart">
          Sales Chart (Mock - Integrate Chart.js later)
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        <div className="card">
          <h3>Today</h3>
          <p>$2,150</p>
        </div>
        <div className="card">
          <h3>This Week</h3>
          <p>$8,420</p>
        </div>
        <div className="card">
          <h3>This Month</h3>
          <p>$12,450</p>
        </div>
      </div>
    </div>
  );
}

export default Sales;

