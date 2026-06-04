import React, { useState, useEffect } from "react";
import axios from "axios";
import { Save, Smartphone, Wallet, CreditCard, Cog } from "lucide-react";

// Components
import SystemMaintenance from "./SystemMaintenance"; // Renamed from DatabaseMaintenance
import HolidayMaintenance from "./HolidayMaintenance";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Maintenance = () => {
  const [settings, setSettings] = useState({
    gcash_number: "",
    gcash_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSettings({
        gcash_number: res.data.gcash_number || "",
        gcash_name: res.data.gcash_name || "",
      });
      setLoading(false);
    } catch (err) {
      console.error("Settings fetch error:", err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/settings`, { settings });
      alert("Success: Payment details updated.");
    } catch (err) {
      alert("Failed to update payment details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-5 d-flex align-items-center">
        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
        <span>Loading Operations Management...</span>
      </div>
    );

  return (
    <div className="container-fluid p-3 p-md-4 bg-light min-vh-100">
      <div className="d-flex align-items-center mb-4">
        <Cog className="me-2 text-secondary" />
        <h2 className="fw-bold mb-0">Operations & Settings</h2>
      </div>

      {/* SECTION 1: Payment Settings */}
      <section className="mb-5">
        <div className="card shadow-sm border-0 p-4">
          <div className="d-flex align-items-center mb-4">
            <Wallet className="text-primary me-2" size={20} />
            <h5 className="mb-0 text-dark fw-bold">Payment Account</h5>
          </div>

          <form onSubmit={handleUpdate}>
            <div className="row g-4 justify-content-center">
              {/* GCash Section - Centered using grid columns */}
              <div className="col-12 col-md-8 col-lg-6">
                <div className="p-4 border rounded bg-white shadow-sm h-100">
                  <div className="d-flex align-items-center mb-3">
                    {/* Made the 'G' icon circular and centered */}
                    <div
                      className="bg-primary text-white p-2 rounded-circle me-2 fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: "36px", height: "36px" }}
                    >
                      G
                    </div>
                    <h6 className="fw-bold mb-0">GCash Business Details</h6>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="gcash_number"
                      className="form-control form-control-lg"
                      placeholder="09XX XXX XXXX"
                      value={settings.gcash_number}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-muted">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="gcash_name"
                      className="form-control form-control-lg"
                      placeholder="e.g., JUAN DELA CRUZ"
                      value={settings.gcash_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Aligned the button to center for a more balanced design */}
            <div className="mt-4 text-center">
              <button
                type="submit"
                className="btn btn-primary px-5 py-3 fw-bold shadow-sm rounded-pill"
                disabled={saving}
              >
                {saving ? "Updating..." : "Update Payment Accounts"}
              </button>
            </div>
          </form>
        </div>
      </section>


      {/* SECTION 3: System Housekeeping (Archive, Reset, Export) */}
      <section className="mb-5">
        <SystemMaintenance />
      </section>

      {/* SECTION 4: Holiday Management */}
      <section className="mb-5 pb-5">
        <HolidayMaintenance />
      </section>
    </div>
  );
};

export default Maintenance;
