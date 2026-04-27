import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler,
  ArcElement, // <--- 1. IMPORT THIS
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { TrendingUp, Wallet, ShoppingBag, CreditCard } from 'lucide-react';

// 2. REGISTER IT HERE
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement // <--- 3. ADD THIS TO THE LIST
);

const FinancialOverview = ({ data }) => {
  // 1. Fallback for loading state
  if (!data) return <div className="p-5 text-center text-muted">Loading financial data...</div>;

  // 2. Format Line Chart Data (Monthly Trend)
  const lineChartData = {
    labels: data.monthlyTrend?.map(item => item.label) || [],
    datasets: [{
      label: 'Revenue (₱)',
      data: data.monthlyTrend?.map(item => item.value) || [],
      borderColor: '#10b981',
      tension: 0.4, 
      fill: true,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      pointBackgroundColor: '#10b981',
    }]
  };

  // 3. Format Doughnut Data (Payment Methods)
  const doughnutData = {
    labels: data.paymentMethods?.map(item => item.label) || [],
    datasets: [{
      data: data.paymentMethods?.map(item => item.value) || [],
      backgroundColor: ['#0d6efd', '#ffcc00', '#198754', '#6c757d'],
      borderWidth: 0,
    }]
  };

  // Helper for currency formatting
  const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="row g-4">
      {/* --- ROW 1: MINI STAT CARDS --- */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-4">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary-subtle rounded text-primary"><TrendingUp size={20}/></div>
            <div>
              <small className="text-muted d-block">Monthly Revenue</small>
              <h5 className="fw-bold mb-0 text-dark">{formatCurrency(data.summary?.monthly_revenue)}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-4">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-success-subtle rounded text-success"><ShoppingBag size={20}/></div>
            <div>
              <small className="text-muted d-block">Today's Revenue</small>
              <h5 className="fw-bold mb-0 text-dark">{formatCurrency(data.summary?.daily_revenue)}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-4">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-warning-subtle rounded text-warning"><Wallet size={20}/></div>
            <div>
              <small className="text-muted d-block">Avg. Order Value</small>
              <h5 className="fw-bold mb-0 text-dark">{formatCurrency(data.summary?.aov)}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white h-100 rounded-4">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-info-subtle rounded text-info"><CreditCard size={20}/></div>
            <div>
              <small className="text-muted d-block">Total Orders</small>
              <h5 className="fw-bold mb-0 text-dark">{data.summary?.total_orders || 0}</h5>
            </div>
          </div>
        </div>
      </div>

      {/* --- ROW 2: CHARTS --- */}
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm p-4 h-100 rounded-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 className="fw-bold m-0 text-dark">Revenue Trend (Last 6 Months)</h6>
            <span className="badge bg-light text-dark border">Consolidated Revenue</span>
          </div>
          <div style={{ height: '320px' }}>
            <Line data={lineChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card border-0 shadow-sm p-4 h-100 rounded-4">
          <h6 className="fw-bold mb-4 text-dark">Payment Distribution</h6>
          <div style={{ height: '250px' }}>
            <Doughnut 
              data={doughnutData} 
              options={{ 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } 
                },
                cutout: '70%'
              }} 
            />
          </div>
          <div className="mt-4 border-top pt-3">
             <div className="d-flex justify-content-between small text-muted mb-2">
                <span>Walk-in Revenue</span>
                <span className="fw-bold text-dark">
                  {formatCurrency(data.sources?.find(s => s.label === 'Walk-in')?.value)}
                </span>
             </div>
             <div className="d-flex justify-content-between small text-muted">
                <span>Reservations</span>
                <span className="fw-bold text-dark">
                  {formatCurrency(data.sources?.find(s => s.label === 'Reservation')?.value)}
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;