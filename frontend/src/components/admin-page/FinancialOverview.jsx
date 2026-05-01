import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { TrendingUp, ShoppingBag, Wallet, CreditCard } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

const FinancialOverview = ({ data }) => {
  if (!data) return null;

  const { summary, monthlyTrend, paymentMethods, sources } = data;
  const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const chartOptions = { maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div className="row g-3">
      {/* STAT CARDS */}
      {[
        { label: "Monthly Revenue", val: summary?.monthly_revenue, icon: <TrendingUp />, color: "primary" },
        { label: "Today's Revenue", val: summary?.daily_revenue, icon: <ShoppingBag />, color: "success" },
        { label: "Avg. Order", val: summary?.aov, icon: <Wallet />, color: "warning" },
        { label: "Total Orders", val: summary?.total_orders, icon: <CreditCard />, color: "info", isNum: true }
      ].map((card, i) => (
        <div key={i} className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-4">
            <div className={`p-2 bg-${card.color}-subtle text-${card.color} rounded mb-2`} style={{width: 'fit-content'}}>{card.icon}</div>
            <small className="text-muted d-block">{card.label}</small>
            <h4 className="fw-bold mb-0">{card.isNum ? card.val : formatCurrency(card.val)}</h4>
          </div>
        </div>
      ))}

      {/* CHARTS */}
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm p-4 rounded-4" style={{height: '350px'}}>
          <h6 className="fw-bold mb-3">Revenue Trend</h6>
          <Line options={chartOptions} data={{
            labels: monthlyTrend?.map(t => t.label) || [],
            datasets: [{ label: 'Revenue', data: monthlyTrend?.map(t => t.value) || [], borderColor: '#10b981', fill: true, backgroundColor: 'rgba(16,185,129,0.1)' }]
          }} />
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card border-0 shadow-sm p-4 rounded-4" style={{height: '350px'}}>
          <h6 className="fw-bold mb-3">Revenue Sources</h6>
          <div style={{height: '150px'}} className="mb-4">
            <Doughnut options={chartOptions} data={{
              labels: sources?.map(s => s.label) || [],
              datasets: [{ data: sources?.map(s => s.value) || [], backgroundColor: ['#0d6efd', '#198754'] }]
            }} />
          </div>
          {sources?.map((s, i) => (
            <div key={i} className="d-flex justify-content-between small mb-1">
              <span>{s.label}</span>
              <span className="fw-bold">{formatCurrency(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;