import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Sales() {
  const [filter, setFilter] = useState('This Week');

  // Chart Data Configuration
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        fill: true,
        label: 'Revenue ($)',
        data: [1200, 1900, 1500, 2150, 2500, 3200, 2800],
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { drawBorder: false } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="container-fluid fade-in">
      {/* Header & Filter */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Sales Analytics</h2>
          <p className="text-muted">Detailed performance and revenue tracking</p>
        </div>
        <div className="dropdown">
          <button className="btn btn-white border shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
            <i className="bi bi-calendar3 me-2"></i>{filter}
          </button>
          <ul className="dropdown-menu shadow border-0">
            <li><button className="dropdown-item" onClick={() => setFilter('Today')}>Today</button></li>
            <li><button className="dropdown-item" onClick={() => setFilter('This Week')}>This Week</button></li>
            <li><button className="dropdown-item" onClick={() => setFilter('This Month')}>This Month</button></li>
          </ul>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Today', value: '$2,150', growth: '+12%', color: 'primary', icon: 'bi-cart-check' },
          { label: 'Weekly Revenue', value: '$8,420', growth: '+5%', color: 'success', icon: 'bi-graph-up' },
          { label: 'Monthly Revenue', value: '$34,500', growth: '+18%', color: 'info', icon: 'bi-wallet2' },
          { label: 'Avg. Order Value', value: '$42.50', growth: '-2%', color: 'warning', icon: 'bi-person-badge' }
        ].map((stat, idx) => (
          <div className="col-12 col-sm-6 col-xl-3" key={idx}>
            <div className="card border-0 shadow-sm p-3 h-100">
              <div className="d-flex align-items-center mb-2">
                <div className={`bg-${stat.color}-subtle text-${stat.color} p-2 rounded-3 me-3`}>
                  <i className={`bi ${stat.icon} fs-4`}></i>
                </div>
                <small className="text-muted fw-bold text-uppercase">{stat.label}</small>
              </div>
              <div className="d-flex align-items-end justify-content-between">
                <h3 className="fw-bold mb-0">{stat.value}</h3>
                <span className={`badge bg-${stat.growth.startsWith('+') ? 'success' : 'danger'}-subtle text-${stat.growth.startsWith('+') ? 'success' : 'danger'} rounded-pill`}>
                  {stat.growth}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Sales Chart */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Revenue Trend</h5>
              <button className="btn btn-sm btn-light border"><i className="bi bi-download me-2"></i>Report</button>
            </div>
            <div style={{ height: '350px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Top Selling Table */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-4">Top Selling Items</h5>
            <div className="table-responsive">
              <table className="table table-borderless align-middle mb-0">
                <tbody>
                  {[
                    { name: 'Margherita Pizza', sales: 142, revenue: '$1,844' },
                    { name: 'Chicken Ramen', sales: 98, revenue: '$1,421' },
                    { name: 'Garlic Bread', sales: 85, revenue: '$425' },
                    { name: 'Ice Tea', sales: 76, revenue: '$228' },
                  ].map((item, i) => (
                    <tr key={i} className="border-bottom-faded">
                      <td className="ps-0 py-3">
                        <div className="fw-bold">{item.name}</div>
                        <small className="text-muted">{item.sales} sold</small>
                      </td>
                      <td className="text-end pe-0">
                        <div className="fw-bold text-primary">{item.revenue}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-light w-100 mt-3 btn-sm text-muted">View All Products</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;