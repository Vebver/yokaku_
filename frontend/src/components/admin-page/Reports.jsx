import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import FinancialOverview from "./FinancialOverview";
import InventoryReport from "./InventoryReport";
import OperationalTrends from "./OperationalTrends";
import ProductPerformance from "./ProductPerformance";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

function Reports() {
  return (
    <div className="container-fluid p-4">
      <h2 className="fw-bold mb-4">Hangout Business Intelligence</h2>
      
      <section className="mb-5">
        <h5 className="text-muted mb-3 uppercase small tracking-wider">1. Financial Overview</h5>
        <FinancialOverview />
      </section>

      <section className="mb-5">
        <h5 className="text-muted mb-3 uppercase small tracking-wider">2. Product Performance</h5>
        <ProductPerformance />
      </section>

      <section className="mb-5">
        <h5 className="text-muted mb-3 uppercase small tracking-wider">3. Inventory & Cost</h5>
        <InventoryReport />
      </section>

      <section className="mb-5">
        <h5 className="text-muted mb-3 uppercase small tracking-wider">4. Operational Trends</h5>
        <OperationalTrends />
      </section>
    </div>
  );
}

export default Reports;
