    import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';

const FinancialOverview = ({ data }) => {
  const revenueData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Weekly Revenue',
      data: [12000, 15000, 11000, 18000, 25000, 32000, 28000],
      borderColor: '#10b981',
      fill: true,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    }]
  };

  return (
    <div className="row g-4">
      {/* Mini Stats */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white">
          <small className="text-muted">Avg. Order Value</small>
          <h4 className="fw-bold">₱850.00</h4>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 shadow-sm p-3 bg-white">
          <small className="text-muted">Walk-in Revenue</small>
          <h4 className="fw-bold text-success">₱45,200</h4>
        </div>
      </div>

      {/* Charts */}
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm p-4">
          <h6 className="fw-bold mb-3">Revenue Trend (Weekly)</h6>
          <div style={{ height: '300px' }}><Line data={revenueData} options={{ maintainAspectRatio: false }} /></div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card border-0 shadow-sm p-4">
          <h6 className="fw-bold mb-3">Payment Methods</h6>
          <Doughnut data={{
            labels: ['GCash', 'Cash', 'Card'],
            datasets: [{ data: [60, 30, 10], backgroundColor: ['#007bff', '#28a745', '#ffc107'] }]
          }} />
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;