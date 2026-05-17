import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Search, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Tag 
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });

  const closeBtnRef = useRef(null);

  // Helper to get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => { fetchCategories(); }, []);

const fetchCategories = async () => {
  try {
    setLoading(true);
    const response = await axios.get(`${API_BASE}/categories`, getAuthHeader());
    
    const mappedData = response.data.map((cat, index) => ({
      // Try to find the ID, fallback to the array index if missing (to stop the error)
      id: cat.id || cat._id || cat.category_id || `temp-id-${index}`, 
      name: cat.name,
      description: cat.description,
    }));
    
    setCategories(mappedData);
  } catch (err) {
    console.error("Error fetching categories:", err);
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory({ ...newCategory, [name]: value });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/categories`, newCategory, getAuthHeader());
      fetchCategories();
      setNewCategory({ name: "", description: "" });
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Failed to add category.");
    }
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Delete this category? This might affect products linked to it.")) {
      try {
        await axios.delete(`${API_BASE}/categories/${id}`, getAuthHeader());
        setCategories(categories.filter((c) => c.id !== id));
      } catch (err) {
        alert("Error deleting category. Check if items are still using it.");
      }
    }
  };

  // FILTER & PAGINATION LOGIC
  const filtered = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (loading) return <div className="p-5 text-center"><Loader2 className="animate-spin text-primary mx-auto" /></div>;

  return (
    <div className="container-fluid py-3 py-md-4 text-dark bg-light" style={{ minHeight: '100vh' }}>
      
      {/* 1. RESPONSIVE HEADER */}
      <div className="row g-3 align-items-center mb-4 px-2">
        <div className="col-12 col-lg-4">
          <h2 className="fw-bold mb-0">Category Management</h2>
          <p className="text-muted small mb-0">Organize your restaurant menu</p>
        </div>

        <div className="col-12 col-md-8 col-lg-5">
          <div className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3" style={{ height: '45px' }}>
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="col-12 col-md-4 col-lg-3 text-md-end">
          <button className="btn btn-primary w-100 py-2 fw-bold shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#addCategoryDrawer">
            <Plus size={18} className="me-1" /> Add Category
          </button>
        </div>
      </div>

      {/* 2. TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '700px' }}>
            <thead className="bg-light border-bottom">
              <tr className="text-muted x-small text-uppercase">
                <th className="ps-4 py-3">Category Name</th>
                <th>Description</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((cat,index) => (
                <tr key={cat.id}>
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center">
                      <div>
                        <div className="fw-bold text-dark">{cat.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted small">
                      {cat.description || <em className="opacity-50">No description provided</em>}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-danger border-0 p-2 shadow-none" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center p-5 text-muted">No categories found matching your search.</div>
          )}
        </div>
      </div>

      {/* 3. PAGINATION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, filtered.length)}</strong> of <strong>{filtered.length}</strong>
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            </li>
            <li className="page-item disabled">
              <span className="page-link border-0 text-dark fw-bold px-3 py-2 bg-white">Page {currentPage} of {totalPages || 1}</span>
            </li>
            <li className={`page-item ${currentPage >= totalPages || totalPages === 0 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= totalPages}><ChevronRight size={16} /></button>
            </li>
          </ul>
        </nav>
      </div>

      {/* --- ADD CATEGORY SIDE DRAWER --- */}
      <div className="offcanvas offcanvas-end border-0 shadow" id="addCategoryDrawer" data-bs-backdrop="false" style={{ width: "min(100%, 400px)" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold m-0"><Tag size={20} className="me-2 text-primary" />Create Category</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>

        <div className="offcanvas-body">
          <form onSubmit={handleAddCategory} className="d-flex flex-column gap-3">
            <div>
              <label className="x-small fw-bold text-muted mb-1">CATEGORY NAME</label>
              <input type="text" name="name" placeholder="e.g. Main Course, Seafood" className="form-control" value={newCategory.name} onChange={handleInputChange} required />
            </div>

            <div>
              <label className="x-small fw-bold text-muted mb-1">DESCRIPTION (OPTIONAL)</label>
              <textarea name="description" className="form-control" rows="5" value={newCategory.description} onChange={handleInputChange} placeholder="Describe the items in this category..."></textarea>
            </div>

            <div className="mt-2">
              <button type="submit" className="btn btn-primary w-100 py-2 fw-bold shadow-sm">Save Category</button>
              <button type="button" className="btn btn-light w-100 mt-2 x-small border" data-bs-dismiss="offcanvas">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <style>{`.x-small { font-size: 0.65rem; letter-spacing: 0.5px; } .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Categories;