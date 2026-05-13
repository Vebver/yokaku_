import React, { useState, useEffect } from "react";
import api from "../../api"; // Using your smart axios instance
import { TrendingUp, Clock, Save, Zap } from "lucide-react";

const PricingMaintenance = () => {
  const [config, setConfig] = useState({
    is_peak_enabled: false,
    peak_increase_percent: 20,
    peak_start_time: "17:00",
    peak_end_time: "21:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Fetch settings when component loads
 useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await api.get("/settings/peak-pricing");
        console.log("Pricing Data from DB:", res.data); // Debug: See what the DB is actually sending

        if (res.data) {
          setConfig({
            // IMPROVED LOGIC: Handles 1, "1", true, and "true"
            is_peak_enabled: 
              res.data.is_peak_enabled == 1 || 
              res.data.is_peak_enabled === true || 
              res.data.is_peak_enabled === "true" || 
              res.data.is_peak_enabled === "1",

            peak_increase_percent: res.data.peak_increase_percent || 20,
            peak_start_time: res.data.peak_start_time || "17:00",
            peak_end_time: res.data.peak_end_time || "21:00",
          });
        }
      } catch (err) {
        console.error("Error loading pricing:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, []);

  // 2. Save settings to DB
  const handleSave = async () => {
    setSaving(true);
    try {
      // Send data to dedicated table
      await api.put("/settings/peak-pricing", config);
      alert("Peak hour pricing updated successfully!");
    } catch (err) {
      alert("Failed to save pricing settings.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Guard: Stay hidden while parent is loading, but show once ready
  if (loading) return <div className="text-center p-3 text-muted small">Loading Pricing Config...</div>;

  return (
    <div className="card shadow-sm border-0 p-3 mt-3 mb-4">
      {/* Header */}
      <div className="d-flex align-items-center mb-3">
        <div className="bg-warning-subtle p-2 rounded-circle me-2 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
          <Zap size={16} className="text-warning" />
        </div>
        <h6 className="mb-0 fw-bold">Peak Hour Pricing Maintenance</h6>
      </div>

      {/* Grid Row */}
        <div className="row g-2 align-items-end">
        
        {/* 1. Status Toggle */}
        <div className="col-md-2">
          <label className="text-muted fw-bold mb-1" style={{ fontSize: '0.65rem', display: 'block' }}>STATUS</label>
          <div className="d-flex align-items-center bg-light border rounded px-2" style={{ height: '31px' }}>
            <div className="form-check form-switch m-0 p-0 d-flex align-items-center">
              <input 
                className="form-check-input ms-0 cursor-pointer" 
                type="checkbox" 
                checked={config.is_peak_enabled}
                onChange={(e) => setConfig({...config, is_peak_enabled: e.target.checked})}
                style={{ width: '1.8rem', height: '0.9rem' }}
              />
              <span className="ms-2 fw-bold" style={{ fontSize: '0.6rem', color: config.is_peak_enabled ? '#10b981' : '#6c757d' }}>
                {config.is_peak_enabled ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Increase Percentage - FIXED INPUT GROUP */}
        <div className="col-md-2">
          <label className="text-muted fw-bold mb-1" style={{ fontSize: '0.65rem', display: 'block' }}>
            <TrendingUp size={12} className="me-1" /> INCREASE
          </label>
          <div className="d-flex align-items-center position-relative">
            <input 
              type="number" 
              className="form-control form-control-sm fw-bold pe-4" 
              value={config.peak_increase_percent}
              onChange={(e) => setConfig({...config, peak_increase_percent: e.target.value})}
              style={{ height: '31px', fontSize: '0.8rem' }}
            />
            <span className="position-absolute end-0 me-2 fw-bold text-muted" style={{ fontSize: '0.75rem' }}>%</span>
          </div>
        </div>

        {/* 3. Start Time */}
        <div className="col-md-2">
          <label className="text-muted fw-bold mb-1" style={{ fontSize: '0.65rem', display: 'block' }}>
            <Clock size={12} className="me-1" /> START
          </label>
          <input 
            type="time" 
            className="form-control form-control-sm fw-bold text-center" 
            value={config.peak_start_time}
            onChange={(e) => setConfig({...config, peak_start_time: e.target.value})}
            style={{ height: '31px', fontSize: '0.75rem' }}
          />
        </div>

        {/* 4. End Time */}
        <div className="col-md-2">
          <label className="text-muted fw-bold mb-1" style={{ fontSize: '0.65rem', display: 'block' }}>
            <Clock size={12} className="me-1" /> END
          </label>
          <input 
            type="time" 
            className="form-control form-control-sm fw-bold text-center" 
            value={config.peak_end_time}
            onChange={(e) => setConfig({...config, peak_end_time: e.target.value})}
            style={{ height: '31px', fontSize: '0.75rem' }}
          />
        </div>

        {/* 5. Save Button */}
        <div className="col-md-4">
          <button 
            className="btn btn-dark btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
            style={{ height: '31px', fontSize: '0.75rem' }}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Pricing Configuration"}
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-muted" style={{ fontSize: '0.6rem', fontStyle: 'italic' }}>
        * Prices will automatically adjust across the menu during these hours when active.
      </div>

      <style>{`
        .cursor-pointer { cursor: pointer; }
        .bg-warning-subtle { background-color: #fef9c3; }
        .text-warning { color: #ca8a04 !important; }
      `}</style>
    </div>
  );
};

export default PricingMaintenance;