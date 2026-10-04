import React, { useState, useEffect, Suspense, lazy } from "react";
import api from "../../api";
import { Wallet, Settings, Smartphone } from "lucide-react";

// Both housekeeping panels sit below the GCash form, so their chunks and
  // their data fetches were running before the user had scrolled to them.
const SystemMaintenance = lazy(() => import("./SystemMaintenance"));
const HolidayMaintenance = lazy(() => import("./HolidayMaintenance"));
import { useToast } from "../ToastContext";

const SectionLoader = () => (
  <div className="d-flex justify-content-center align-items-center py-5">
    <div className="spinner-border text-secondary" role="status"></div>
  </div>
);

const Maintenance = () => {
  const { showToast } = useToast();
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
      const res = await api.get(`/settings`);
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
      await api.put(`/settings`, { settings });
      showToast("Success: Payment details updated.", "success");
    } catch (err) {
      showToast("Failed to update payment details.");
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
      <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
        <h2 className="fw-bold mb-0">Operations &amp; Settings</h2>
      </div>

      <p className="text-muted mb-4">
        Manage your operations in one place: update GCash details, perform system maintenance (backups, exports, and resets), and set closure dates to pause reservations.
      </p>

      {/* SECTION 1: Payment Settings */}
      <section className="mb-5">
        <div className="card shadow-sm border-0 p-4">
          <div className="d-flex align-items-center mb-4">
            <h5 className="mb-0 text-dark fw-bold">Payment Account</h5>
          </div>

          <form onSubmit={handleUpdate}>
            <div className="row g-4 justify-content-center">
              {/* GCash Section - Centered using grid columns */}
              <div className="col-12 col-md-8 col-lg-6">
                <div className="p-4 border rounded bg-white shadow-sm h-100">
                  <div className="d-flex align-items-center mb-3">
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
                {saving ? "Updating..." : "Update Payment Account"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* SECTION 3: System Housekeeping (Archive, Reset, Export) */}
      <section className="mb-5">
        <Suspense fallback={<SectionLoader />}>
          <SystemMaintenance />
        </Suspense>
      </section>

      {/* SECTION 4: Holiday Management */}
      <section className="mb-5 pb-5">
        <Suspense fallback={<SectionLoader />}>
          <HolidayMaintenance />
        </Suspense>
      </section>
    </div>
  );
};

export default Maintenance;
