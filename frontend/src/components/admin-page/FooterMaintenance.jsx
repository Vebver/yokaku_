import React, { useState, useEffect } from "react";
import api from "../../api";
import { useToast } from "../ToastContext";
import { useSectionRefresh } from "../shared/sectionRefresh";

// Keys stored in the shared system_settings table (see settingController).
const FOOTER_SECTIONS = [
  {
    key: "footer_contact",
    title: "Contact Us",
    placeholder:
      "Facebook: Hangout Resto Marilao Bulacan\nEmail: abrevointernational@gmail.com\nPhone: 0905 804 5458",
    hint: "One item per line in name: value format. Labels become bold in the footer.",
  },
  {
    key: "footer_about",
    title: "About Us",
    placeholder:
      "Location: Purok 3, Ibayo, Marilao, Bulacan, 3019\nOpen Daily: 10:00 AM - 11:00 PM",
    hint: "One item per line in name: value format. Labels become bold in the footer.",
  },
  {
    key: "footer_terms",
    title: "Terms and Conditions",
    placeholder:
      "1. No Smoking: Smoking is prohibited inside the restaurant.\n2. Cancellation Policy: ...",
    hint: "Shown in the customer Terms and Conditions modal. Blank keeps the built-in terms.",
  },
];

const FooterMaintenance = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [sections, setSections] = useState(
    FOOTER_SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: "" }), {}),
  );

  const fetchFooter = async () => {
    try {
      setFetchError(false);
      const res = await api.get(`/settings`);
      setSections({
        footer_contact: res.data.footer_contact || "",
        footer_about: res.data.footer_about || "",
        footer_terms: res.data.footer_terms || "",
      });
    } catch (err) {
      console.error("Footer fetch error:", err);
      setFetchError(true);
      showToast("Failed to load footer content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(fetchFooter);

  const handleChange = (key, value) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (fetchError) {
      showToast("Footer content could not be loaded. Please refresh and try again.", "warning");
      return;
    }

    // Validation: Contact and About are required (the footer always shows them).
    const contact = (sections.footer_contact || "").trim();
    const about = (sections.footer_about || "").trim();
    const errors = [];
    if (!contact) errors.push("Contact Us content cannot be empty.");
    if (!about) errors.push("About Us content cannot be empty.");
    if (errors.length > 0) {
      showToast(errors.join(" "), "warning");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/settings`, {
        settings: {
          footer_contact: contact,
          footer_about: about,
          footer_terms: (sections.footer_terms || "").trim(),
        },
      });
      showToast("Success: Footer content updated.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to update footer content.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="d-flex align-items-center py-3">
        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
        <span>Loading Footer Management...</span>
      </div>
    );

  return (
    <div className="card shadow-sm border-0 p-4">
      <div className="d-flex align-items-center mb-1 flex-wrap gap-2">
        <h3 className="mb-0 text-dark fw-bold">Footer Management</h3>
      </div>
      <p className="text-muted small mb-4">
        Edit the public footer sections. Enter each item on its own line using <strong>Name: Value</strong> format.
      </p>

      <form onSubmit={handleSave}>
        {FOOTER_SECTIONS.map((section) => (
          <div className="mb-3" key={section.key}>
            <label className="form-label small fw-bold text-muted mb-1">
              {section.title}
            </label>
            <textarea
              className="form-control"
              rows={6}
              value={sections[section.key]}
              onChange={(e) => handleChange(section.key, e.target.value)}
              placeholder={section.placeholder}
              disabled={saving || fetchError}
              style={{ whiteSpace: "pre" }}
            />
            <p className="text-muted mt-1 mb-0" style={{ fontSize: "0.75rem" }}>
              {section.hint}
            </p>
          </div>
        ))}

        <div className="mt-4 text-center">
          <button
            type="submit"
            className="btn btn-primary px-5 py-3 fw-bold shadow-sm rounded-pill"
            disabled={saving || fetchError}
          >
            {saving ? "Updating..." : "Update Content"}
          </button>
        </div>
        {fetchError && (
          <p className="text-danger small mt-3 mb-0">
            The footer could not be loaded from the server, so saving is disabled.
          </p>
        )}
      </form>
    </div>
  );
};

export default FooterMaintenance;
