import React, { useState, useEffect, useRef } from "react";
import { Trash2, Upload } from "lucide-react"; // Added icons
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
  // NEW: States for Exclusive Offers
  const [exclusiveOffers, setExclusiveOffers] = useState([]);
  const [uploadingOffer, setUploadingOffer] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFooter = async () => {
    try {
      setFetchError(false);
      const res = await api.get(`/settings`);
      setSections({
        footer_contact: res.data.footer_contact || "",
        footer_about: res.data.footer_about || "",
        footer_terms: res.data.footer_terms || "",
      });
      setExclusiveOffers(res.data.exclusive_offers || []); // Set offers
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
      showToast(
        "Footer content could not be loaded. Please refresh and try again.",
        "warning",
      );
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

  // NEW: Handle Image Upload
  const handleOfferUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingOffer(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post("/settings/exclusive-offers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setExclusiveOffers(res.data.offers);
      showToast("Exclusive offer uploaded successfully.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to upload image.",
        "error",
      );
    } finally {
      setUploadingOffer(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // NEW: Handle Delete
  const handleDeleteOffer = async (id) => {
    if (
      !window.confirm("Are you sure you want to remove this exclusive offer?")
    )
      return;

    try {
      const res = await api.delete(`/settings/exclusive-offers/${id}`);
      setExclusiveOffers(res.data.offers);
      showToast("Image removed successfully.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to delete image.",
        "error",
      );
    }
  };

  if (loading)
    return (
      <div className="d-flex align-items-center py-3">
        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
        <span>Loading Website Information...</span>
      </div>
    );

  return (
    <div className="card shadow-sm border-0 p-4">
      <div className="d-flex align-items-center mb-1 flex-wrap gap-2">
        <h3 className="mb-0 text-dark fw-bold">Website Information</h3>
      </div>
      <p className="text-muted small mb-4">
        Edit the public footer sections. Enter each item on its own line using{" "}
        <strong>Name: Value</strong> format.
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

        {/* NEW: Exclusive Offers Section */}
        <div className="mb-4 mt-4 pt-3 border-top">
          <label className="form-label small fw-bold text-muted mb-2">
            Exclusive Offers (Promo Images)
          </label>

          <div className="d-flex flex-wrap gap-3 mb-3">
            {exclusiveOffers.map((offer) => (
              <div
                key={offer.id}
                style={{ position: "relative", width: "120px", height: "80px" }}
              >
                <img
                  src={offer.url}
                  alt="Exclusive Offer"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="btn btn-danger btn-sm"
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    borderRadius: "50%",
                    padding: "4px 6px",
                  }}
                  title="Remove Image"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {exclusiveOffers.length === 0 && (
              <span className="text-muted small">
                No exclusive offers added yet.
              </span>
            )}
          </div>

          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            ref={fileInputRef}
            onChange={handleOfferUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-bold"
            onClick={() => fileInputRef.current.click()}
            disabled={uploadingOffer}
          >
            {uploadingOffer ? (
              "Uploading..."
            ) : (
              <>
                <Upload size={14} className="me-2" /> Add Promo Image
              </>
            )}
          </button>
          <p className="text-muted mt-1 mb-0" style={{ fontSize: "0.75rem" }}>
            Upload images to display in the "Don't Miss Our Exclusive Offers"
            section on the homepage.
          </p>
        </div>

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
            The footer could not be loaded from the server, so saving is
            disabled.
          </p>
        )}
      </form>
    </div>
  );
};

export default FooterMaintenance;
