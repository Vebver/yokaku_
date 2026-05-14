import React, { useState, useEffect } from "react";
import axios from "axios";
import { Save, Smartphone, User, RefreshCw } from "lucide-react";
// 1. IMPORT THE NEW FILE
import DatabaseMaintenance from "./DatabaseMaintenance";
import HolidayMaintenance from "./HolidayMaintenance";
import PricingMaintenance from "./PricingMaintenance";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Maintenance = () => {
  const [settings, setSettings] = useState({
    gcash_number: "",
    gcash_name: "",
    maya_number: "",
    maya_name: "",
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
        maya_number: res.data.maya_number || "",
        maya_name: res.data.maya_name || "",
      });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/settings`, { settings });
      alert("Payment details updated successfully!");
    } catch (err) {
      alert("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-5">Loading Maintenance...</div>;

  return (
    <div className="container p-4">
      <h2 className="fw-bold mb-4">System Maintenance</h2>

      {/* SECTION 1: Payment Settings */}
      <div className="card shadow-sm border-0 p-4">
        <h5 className="mb-4 text-primary fw-bold">Payment Account Settings</h5>
        <form onSubmit={handleUpdate}>
          <div className="row g-4">
            {/* GCash Section */}
            <div className="col-md-6">
              <div className="p-3 border rounded bg-light">
                <h6 className="fw-bold mb-3">GCash Details</h6>
                <div className="mb-3">
                  <label className="small fw-bold">Phone Number</label>
                  <input
                    type="text"
                    name="gcash_number"
                    className="form-control"
                    value={settings.gcash_number}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="small fw-bold">Account Name</label>
                  <input
                    type="text"
                    name="gcash_name"
                    className="form-control"
                    value={settings.gcash_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Maya Section */}
            <div className="col-md-6">
              <div className="p-3 border rounded bg-light">
                <h6 className="fw-bold mb-3">Maya Details</h6>
                <div className="mb-3">
                  <label className="small fw-bold">Phone Number</label>
                  <input
                    type="text"
                    name="maya_number"
                    className="form-control"
                    value={settings.maya_number}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="small fw-bold">Account Name</label>
                  <input
                    type="text"
                    name="maya_name"
                    className="form-control"
                    value={settings.maya_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-end">
            <button
              type="submit"
              className="btn btn-primary px-5 py-2 fw-bold"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <PricingMaintenance />
      {/* SECTION 2: Database Maintenance */}
      <DatabaseMaintenance />
      <HolidayMaintenance />
    </div>
  );
};

export default Maintenance;
