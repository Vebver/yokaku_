import React, { useState, useEffect, useRef } from "react";
import api from "../../api";
import { 
  Search, 
  Trash2, 
  Plus, 
  Loader2,
  Tag
} from "lucide-react";
import { useToast } from "../ToastContext";
import AdminPagination from "../shared/AdminPagination";
import { useConfirmation } from "../ConfirmationContext";

function Categories() {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [visibleCategoryIds, setVisibleCategoryIds] = useState([]);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [newCategory, setNewCategory] = useState({
    category_name: "", // Changed from name to category_name
    description: "",
  });

  const closeBtnRef = useRef(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [response, settingsResponse] = await Promise.all([
        api.get(`/categories`),
        api.get(`/settings`),
      ]);

      const mappedData = response.data.map((cat, index) => ({
        id: cat.category_id || cat.id || cat._id || `temp-${index}`,
        category_name: cat.category_name || cat.name || "Unnamed",
        description: cat.description || "",
      }));

      const sortedCategories = mappedData.sort(
        (a, b) => Number(b.id) - Number(a.id),
      );
      const savedVisibility = settingsResponse.data.kiosk_visible_categories;
      let selectedIds = sortedCategories.map((category) => String(category.id));
      if (savedVisibility != null && savedVisibility !== "") {
        try {
          const parsedVisibility = JSON.parse(savedVisibility);
          if (
            !Array.isArray(parsedVisibility) ||
            parsedVisibility.some(
              (id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1,
            )
          ) {
            throw new Error("Saved kiosk category visibility is invalid.");
          }
          const validIds = new Set(
            sortedCategories.map((category) => String(category.id)),
          );
          selectedIds = parsedVisibility
            .map(String)
            .filter((id) => validIds.has(id));
        } catch (error) {
          console.error("Could not read kiosk category visibility:", error);
          showToast("Saved kiosk category visibility could not be loaded.", "error");
        }
      }

      setCategories(sortedCategories);
      setVisibleCategoryIds(selectedIds);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching categories:", err);
      showToast("Could not load categories and kiosk visibility settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoryVisibility = (categoryId) => {
    const id = String(categoryId);
    setVisibleCategoryIds((current) =>
      current.includes(id)
        ? current.filter((visibleId) => visibleId !== id)
        : [...current, id],
    );
  };

  const saveCategoryVisibility = async () => {
    setSavingVisibility(true);
    try {
      await api.put("/settings", {
        settings: {
          kiosk_visible_categories: JSON.stringify(visibleCategoryIds),
        },
      });
      showToast("Kiosk categories updated.", "success");
    } catch (error) {
      const message = error.response?.data?.error || "";
      showToast(
        message.includes("Unknown setting: kiosk_visible_categories")
          ? "The backend is outdated. Deploy/restart it with the kiosk category settings update, then try again."
          : message || "Could not save kiosk categories.",
        "error",
      );
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory({ ...newCategory, [name]: value });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/categories`, {
        category_name: newCategory.category_name.trim(),
        description: newCategory.description.trim() || null,
      });
      fetchCategories();
      setNewCategory({ category_name: "", description: "" });
      if (closeBtnRef.current) closeBtnRef.current.click();
      showToast("New Category Added", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add category.","error");
    }
  };

  const deleteCategory = async (id) => {
    if (!(await confirm({
      title: "Delete category",
      message: "Delete this category? Menu items assigned to it may be affected.",
      confirmLabel: "Delete category",
    }))) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      showToast("Deleted Successfully","success");
    } catch (err) {
      showToast("Error deleting category.", "error");
    }
  };

  // FIX 3: Robust filter with Null Safety
  const filtered = categories.filter(cat => {
    const name = (cat.category_name || "").toLowerCase();
    const desc = (cat.description || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || desc.includes(search);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin text-primary mx-auto" /></div>;

  return (
    <div className="container-fluid py-3 py-md-4 text-dark bg-light" style={{ minHeight: '100vh' }}>

      {/* HEADER */}
      <div className="admin-page-header px-2 mb-3">
        <h2 className="fw-bold mb-0">Categories</h2>
        <p className="text-muted small mb-0">Organize menu items</p>
      </div>

      <div className="admin-toolbar row g-2 align-items-center mb-4 px-2">
        <div className="col-12 col-md-8 col-lg-9">
          <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3">
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              placeholder="Search Categories"
              aria-label="Search categories"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <div className="col-12 col-md-4 col-lg-3">
          <button className="btn btn-primary admin-toolbar-button w-100 fw-bold shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#addCategoryDrawer">
            <Plus size={18} className="me-1" /> New Category
          </button>
        </div>
      </div>

      <div className="mx-2 mb-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
        <div>
          <h3 className="h6 fw-bold mb-1">Kiosk menu categories</h3>
          <p className="text-muted small mb-0">
            Select the categories customers can browse at the kiosk.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary fw-bold"
          onClick={saveCategoryVisibility}
          disabled={savingVisibility}
        >
          {savingVisibility ? "Saving..." : "Save kiosk categories"}
        </button>
      </div>

      {/* LIST SECTION */}
      <div className="mx-2">
        {/* DESKTOP TABLE */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-none d-md-block">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4">Category Name</th>
                <th>Description</th>
                <th>Show on kiosk</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((cat) => (
                <tr key={cat.id}>
                  <td className="ps-4 py-3 fw-bold">{cat.category_name}</td>
                  <td className="text-muted small">{cat.description || "No description"}</td>
                  <td>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`kiosk-category-${cat.id}`}
                        checked={visibleCategoryIds.includes(String(cat.id))}
                        onChange={() => toggleCategoryVisibility(cat.id)}
                        aria-label={`Show ${cat.category_name} on kiosk`}
                      />
                      <label
                        className="form-check-label small"
                        htmlFor={`kiosk-category-${cat.id}`}
                      >
                        Visible
                      </label>
                    </div>
                  </td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-danger border-0 d-inline-flex align-items-center gap-1" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 size={18} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST */}
        <div className="d-md-none d-flex flex-column gap-2">
          {currentItems.map((cat) => (
            <div key={cat.id} className="bg-white border rounded-3 p-3 shadow-sm">
               <div className="d-flex justify-content-between">
                  <div>
                    <div className="fw-bold">{cat.category_name}</div>
                    <div className="text-muted small">{cat.description}</div>
                    <label className="form-check mt-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={visibleCategoryIds.includes(String(cat.id))}
                        onChange={() => toggleCategoryVisibility(cat.id)}
                        aria-label={`Show ${cat.category_name} on kiosk`}
                      />
                      <span className="form-check-label small">Show on kiosk</span>
                    </label>
                  </div>
                  <button className="btn text-danger p-0 d-inline-flex align-items-center gap-1" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 size={18} /> Delete
                  </button>
               </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="text-center p-5 text-muted">No categories found.</div>}
      </div>

      {/* PAGINATION */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* ADD CATEGORY DRAWER */}
      <div className="offcanvas offcanvas-end" id="addCategoryDrawer" style={{ width: "min(100%, 400px)" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold m-0"><Tag size={20} className="me-2 text-primary" />Create Category</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAddCategory} className="d-flex flex-column gap-3">
            <div>
              <label className="small fw-bold text-muted mb-1">NAME</label>
              {/* FIX: name="category_name" to match state */}
              <input type="text" name="category_name" className="form-control" value={newCategory.category_name} onChange={handleInputChange} required />
            </div>
            <div>
              <label className="small fw-bold text-muted mb-1">DESCRIPTION</label>
              <textarea name="description" className="form-control" rows="4" value={newCategory.description} onChange={handleInputChange}></textarea>
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">Save Category</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Categories;