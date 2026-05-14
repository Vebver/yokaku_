import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, ShoppingBag, Wallet, CreditCard } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const FinancialOverview = ({ data }) => {
  if (!data) return <div className="p-5 text-center text-muted">No financial data available.</div>;

  const { summary, monthlyTrend } = data;

  // --- THE TRUTH FIX: Calculate the total from the chart data itself ---
  // This sums up every point on your chart to get the REAL Monthly Revenue.
  const realMonthlyTotal = monthlyTrend?.reduce((acc, item) => acc + Number(item.value), 0) || 0;

  const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartOptions = { 
    maintainAspectRatio: false, 
    responsive: true,
    plugins: { 
        legend: { display: false },
        tooltip: {
            backgroundColor: '#1f2937',
            padding: 10,
            titleFont: { size: 12 },
            bodyFont: { size: 14, weight: 'bold' },
            callbacks: {
                label: (context) => ` Revenue: ${formatCurrency(context.raw)}`
            }
        }
    },
    scales: {
        y: {
            ticks: { callback: (val) => '₱' + val.toLocaleString() }
        }
    }
  };

  const statCards = [
    // We use realMonthlyTotal here instead of summary.monthly_revenue
    { label: "Monthly Revenue", val: realMonthlyTotal, icon: <TrendingUp size={20}/>, color: "primary" },
    { label: "Today's Revenue", val: summary?.daily_revenue, icon: <ShoppingBag size={20}/>, color: "success" },
    { label: "Avg. Order", val: summary?.aov, icon: <Wallet size={20}/>, color: "warning" },
    { label: "Total Orders", val: summary?.total_orders, icon: <CreditCard size={20}/>, color: "info", isNum: true }
  ];

  return (
    <div className="row g-3">
      {/* 1. STAT CARDS */}
      {statCards.map((card, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 rounded-4 h-100 bg-white">
            <div className={`d-flex align-items-center justify-content-center bg-${card.color}-subtle text-${card.color} rounded-3 mb-3`} 
                 style={{width: '40px', height: '40px'}}>
              {card.icon}
            </div>
            <p className="text-muted small fw-semibold mb-1 text-uppercase ls-1">{card.label}</p>
            <h4 className="fw-bold mb-0 text-dark">
                {card.isNum ? card.val : formatCurrency(card.val)}
            </h4>
          </div>
        </div>
      ))}

      {/* 2. REVENUE TREND (Full Width) */}
      <div className="col-12">
        <div className="card border-0 shadow-sm p-3 p-md-4 rounded-4 bg-white" style={{ minHeight: '450px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h6 className="fw-bold mb-0">Revenue Trend</h6>
              <small className="text-muted">Total for this period: {formatCurrency(realMonthlyTotal)}</small>
            </div>
            <span className="badge bg-success-subtle text-success">Verified Totals</span>
          </div>
          <div className="flex-grow-1" style={{ height: '350px' }}>
            <Line options={chartOptions} data={{
              labels: monthlyTrend?.map(t => t.label) || [],
              datasets: [{ 
                label: 'Revenue', 
                data: monthlyTrend?.map(t => t.value) || [], 
                borderColor: '#10b981', 
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                fill: true, 
                backgroundColor: 'rgba(16,185,129,0.05)' 
              }]
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;