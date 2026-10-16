import { useEffect, useRef, useState } from "react";
import { Image, Pencil, Plus, Trash2, X } from "lucide-react";
import api, { resolveAssetUrl } from "../../api";
import { useToast } from "../ToastContext";
import { useConfirmation } from "../ConfirmationContext";
import { useSectionRefresh } from "../shared/sectionRefresh";

const emptyForm = {
  title: "",
  description: "",
  announcement_type: "promo",
  is_published: false,
};

const typeLabels = {
  promo: "Promotion",
  menu: "New menu",
  event: "Event",
  update: "Hangout update",
};

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const saveLock = useRef(false);
  const { showToast } = useToast();
  const { confirm } = useConfirmation();

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get("/announcements/admin");
      setAnnouncements(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const status = error.response?.status;
      const message =
        error.response?.data?.error ||
        (status === 401
          ? "Your session expired. Please log in again."
          : status === 403
            ? "You do not have permission to view announcements."
            : !error.response
              ? "Cannot reach the server. Please check your connection."
              : "Could not load announcements.");
      console.error("Failed to load announcements:", status || error.message, error);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useSectionRefresh(loadAnnouncements);

  const resetForm = () => {
    setForm(emptyForm);
    setImage(null);
    setCurrentImage(null);
    setRemoveImage(false);
    setEditingId(null);
  };

  const startEdit = (announcement) => {
    setEditingId(announcement.announcement_id);
    setForm({
      title: announcement.title,
      description: announcement.description,
      announcement_type: announcement.announcement_type,
      is_published: Number(announcement.is_published) === 1,
    });
    setCurrentImage(announcement.local_path || announcement.image_url || null);
    setImage(null);
    setRemoveImage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    const body = new FormData();
    body.append("title", form.title.trim());
    body.append("description", form.description.trim());
    body.append("announcement_type", form.announcement_type);
    body.append("is_published", form.is_published ? "1" : "0");
    body.append("remove_image", removeImage ? "true" : "false");
    if (image) body.append("image", image);

    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, body);
        showToast("Announcement updated.", "success");
      } else {
        await api.post("/announcements", body);
        showToast("Announcement created.", "success");
      }
      resetForm();
      await loadAnnouncements();
    } catch (error) {
      showToast(error.response?.data?.error || "Could not save announcement.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (announcement) => {
    const approved = await confirm({
      title: "Delete announcement",
      message: `Delete “${announcement.title}”? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!approved) return;
    try {
      await api.delete(`/announcements/${announcement.announcement_id}`);
      showToast("Announcement deleted.", "success");
      await loadAnnouncements();
    } catch (error) {
      showToast(error.response?.data?.error || "Could not delete announcement.");
    }
  };

  return (
    <div className="container-fluid p-3 p-md-4 bg-light">
      <div className="admin-page-header px-2 mb-3">
        <h2 className="fw-bold mb-0">Announcements</h2>
        <p className="text-muted mb-0 small">Promotions, menu news, events, and Hangout updates</p>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-5">
          <form className="card border shadow-sm rounded-3 p-3 p-md-4" onSubmit={handleSubmit}>
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h3 className="h5 fw-bold mb-0">{editingId ? "Edit announcement" : "Create announcement"}</h3>
              {editingId && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm} aria-label="Cancel editing">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="announcement-title">Title</label>
              <input id="announcement-title" className="form-control" maxLength={180} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="announcement-type">Type</label>
              <select id="announcement-type" className="form-select" value={form.announcement_type} onChange={(event) => setForm({ ...form, announcement_type: event.target.value })}>
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="announcement-description">Description</label>
              <textarea id="announcement-description" className="form-control" rows={5} required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="announcement-image">Image (optional)</label>
              <input id="announcement-image" className="form-control" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} />
              <div className="form-text">JPG, PNG, or WEBP. Maximum 10 MB.</div>
              {currentImage && !removeImage && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img src={resolveAssetUrl(currentImage)} alt="Current announcement" className="rounded border" style={{ width: 64, height: 48, objectFit: "cover" }} />
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRemoveImage(true)}>Remove image</button>
                </div>
              )}
              {removeImage && <button type="button" className="btn btn-sm btn-link px-0" onClick={() => setRemoveImage(false)}>Keep current image</button>}
            </div>
            <div className="form-check form-switch mb-4">
              <input id="announcement-published" className="form-check-input" type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} />
              <label className="form-check-label fw-semibold" htmlFor="announcement-published">Published and visible to customers</label>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <Plus size={17} className="me-2" />}
                {saving ? "Saving..." : editingId ? "Save changes" : "Create announcement"}
              </button>
              {editingId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="col-12 col-xl-7">
          <div className="d-flex align-items-center justify-content-between px-1 mb-2">
            <h3 className="h5 fw-bold mb-0">Existing announcements</h3>
            <span className="small text-muted">{announcements.length} total</span>
          </div>
          {loading ? (
            <div className="text-center py-5"><span className="spinner-border text-primary" role="status" /><span className="visually-hidden">Loading announcements</span></div>
          ) : announcements.length === 0 ? (
            <div className="text-center text-muted bg-white border rounded-3 p-4">No announcements yet.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {announcements.map((announcement) => (
                <article key={announcement.announcement_id} className="bg-white border rounded-3 p-3 shadow-sm">
                  <div className="d-flex gap-3 align-items-start">
                    {announcement.local_path || announcement.image_url ? (
                      <img src={resolveAssetUrl(announcement.local_path || announcement.image_url)} alt="" className="rounded border flex-shrink-0" style={{ width: 76, height: 64, objectFit: "cover" }} />
                    ) : (
                      <div className="rounded border bg-light text-muted d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 76, height: 64 }} aria-hidden="true"><Image size={22} /></div>
                    )}
                    <div className="min-w-0 flex-grow-1">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <h4 className="h6 fw-bold mb-0 text-break">{announcement.title}</h4>
                        <span className={`badge ${Number(announcement.is_published) === 1 ? "text-bg-success" : "text-bg-secondary"}`}>
                          {Number(announcement.is_published) === 1 ? "Published" : "Draft"}
                        </span>
                        <span className="badge text-bg-light border text-dark">{typeLabels[announcement.announcement_type] || "Update"}</span>
                      </div>
                      <p className="small text-muted mb-0 text-break" style={{ whiteSpace: "pre-wrap" }}>{announcement.description}</p>
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEdit(announcement)} aria-label={`Edit ${announcement.title}`}><Pencil size={16} /></button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteAnnouncement(announcement)} aria-label={`Delete ${announcement.title}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Announcements;
