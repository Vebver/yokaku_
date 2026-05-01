import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Clock, Calendar, RefreshCcw, XCircle } from 'lucide-react';

const OperationalTrends = () => {
  const peakHourData = {
    labels: ['11am', '1pm', '3pm', '5pm', '7pm', '9pm', '11pm'],
    datasets: [{
      label: 'Customer Traffic',
      data: [20, 45, 15, 30, 85, 95, 40],
      backgroundColor: (context) => context.raw > 80 ? '#dc3545' : '#0d6efd',
      borderRadius: 5,
    }]
  };

  return (
    <div className="row g-4 mt-1">
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm p-4">
          <h6 className="fw-bold mb-3"><Clock size={18} className="me-2"/>Peak Hours (Traffic Density)</h6>
          <div style={{ height: '250px' }}><Bar data={peakHourData} options={{ maintainAspectRatio: false }} /></div>
          <p className="small text-muted mt-3 italic">* Red bars indicate critical staffing periods (staffing should be doubled).</p>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card border-0 shadow-sm p-4 bg-dark text-white">
          <h6 className="fw-bold mb-4 text-warning">Efficiency Metrics</h6>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <span><RefreshCcw size={16} className="me-2"/> Table Turnover</span>
            <span className="fw-bold">1.5 hrs</span>
          </div>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <span><Calendar size={16} className="me-2"/> Busiest Day</span>
            <span className="fw-bold">Saturday</span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span><XCircle size={16} className="me-2"/> Cancel Rate</span>
            <span className="fw-bold text-danger">4.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalTrends;