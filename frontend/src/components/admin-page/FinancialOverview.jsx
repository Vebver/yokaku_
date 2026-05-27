import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, ShoppingBag, Wallet, CreditCard } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const FinancialOverview = ({ data }) => {
  const reportData = data?.data || data; 
  const [period, setPeriod] = useState('monthly'); // This is the state we need to use

  if (!reportData || !reportData.summary) {
    return <div className="p-5 text-center text-muted">No financial data available.</div>;
  }

  const { summary } = reportData;
  
  // Helper to select the correct array based on state
  const getActiveTrend = () => {
    if (period === 'weekly') return reportData.weeklyTrend || [];
    if (period === 'yearly') return reportData.yearlyTrend || [];
    return reportData.monthlyTrend || [];
  };

  const activeTrend = getActiveTrend();

  // Mapping summary values
  const totalMonthly = Number(summary.monthly_revenue || 0);
  const totalDaily = Number(summary.daily_revenue || 0);
  const averageOrder = Number(summary.aov || 0);
  const totalOrders = Number(summary.total_orders || 0);

  const formatCurrency = (val) => `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartOptions = { 
    maintainAspectRatio: false, 
    responsive: true,
    plugins: { 
        legend: { display: false },
        tooltip: {
            backgroundColor: '#1f2937',
            callbacks: {
                label: (context) => ` Revenue: ${formatCurrency(context.raw)}`
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: { callback: (val) => '₱' + val.toLocaleString() }
        }
    }
  };

  const statCards = [
    { label: "Monthly Revenue", val: totalMonthly, icon: <TrendingUp size={20}/>, color: "primary" },
    { label: "Today's Revenue", val: totalDaily, icon: <ShoppingBag size={20}/>, color: "success" },
    { label: "Avg. Order", val: averageOrder, icon: <Wallet size={20}/>, color: "warning" },
    { label: "Total Orders", val: totalOrders, icon: <CreditCard size={20}/>, color: "info", isNum: true }
  ];

  return (
    <div className="row g-3">
      {/* STAT CARDS */}
      {statCards.map((card, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 rounded-4 h-100 bg-white">
            <div className={`d-flex align-items-center justify-content-center bg-${card.color}-subtle text-${card.color} rounded-3 mb-3`} 
                 style={{width: '40px', height: '40px'}}>
              {card.icon}
            </div>
            <p className="text-muted small fw-semibold mb-1 text-uppercase">{card.label}</p>
            <h4 className="fw-bold mb-0 text-dark">
                {card.isNum ? Number(card.val).toLocaleString() : formatCurrency(card.val)}
            </h4>
          </div>
        </div>
      ))}

      {/* CHART SECTION */}
      <div className="col-12">
        <div className="card border-0 shadow-sm p-4 rounded-4 bg-white" style={{ minHeight: '450px' }}>
          <div className="mb-4">
            <h6 className="fw-bold mb-0">Revenue Trend</h6>
            <small className="text-muted">Profit/Revenue performance by period</small>

            {/* CAPSULE TABS */}
            <div className="d-flex gap-2 mt-3">
              {[
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'yearly', label: 'Yearly' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`btn btn-sm px-3 rounded-pill fw-bold ${period === t.key ? 'btn-warning shadow-sm' : 'btn-outline-secondary'}`}
                  onClick={() => setPeriod(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-grow-1" style={{ height: '350px' }}>
            <Line 
              options={chartOptions} 
              data={{
                // FIX: Use the activeTrend labels
                labels: activeTrend.map(t => t.label || t.month || t.date || t.year),
                datasets: [{
                  label: 'Revenue',
                  // FIX: Use the activeTrend values
                  data: activeTrend.map(t => Number(t.value || t.revenue || 0)),
                  borderColor: '#10b981',
                  borderWidth: 3,
                  tension: 0.4,
                  pointRadius: 4,
                  fill: true,
                  backgroundColor: 'rgba(16,185,129,0.05)'
                }]
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;