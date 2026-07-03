import React, { useState, useEffect, useRef } from "react";
import api from "../../api";
import { 
  Search, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Tag
} from "lucide-react";
import { useToast } from "../ToastContext";

function Categories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const [newCategory, setNewCategory] = useState({
    category_name: "", // Changed from name to category_name
    description: "",
  });

  const closeBtnRef = useRef(null);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories`);
      
      // FIX 1: Ensure the mapped keys match what the UI calls
      const mappedData = response.data.map((cat, index) => ({
        id: cat.category_id || cat.id || cat._id || `temp-${index}`, 
        category_name: cat.category_name || cat.name || "Unnamed", // Keep category_name
        description: cat.description || "",
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
      await api.post(`/categories`, newCategory, getAuthHeader());
      fetchCategories();
      setNewCategory({ category_name: "", description: "" });
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      showToast("Failed to add category.");
    }
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Delete this category?")) {
      try {
        await api.delete(`/categories/${id}`);
        setCategories(categories.filter((c) => c.id !== id));
      } catch (err) {
        showToast("Error deleting category.");
      }
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
      <div className="row g-3 align-items-center mb-4 px-2">
        <div className="col-12 col-md-4">
          <h2 className="fw-bold mb-0">Categories</h2>
          <p className="text-muted small mb-0">Organize menu items</p>
        </div>

        <div className="col-12 col-md-5">
          <div className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3" style={{ height: '45px' }}>
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none"
              placeholder="Search Categories"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="col-12 col-md-3">
          <button className="btn btn-primary w-100 py-2 fw-bold shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#addCategoryDrawer">
            <Plus size={18} className="me-1" /> New Category
          </button>
        </div>
      </div>

      {/* LIST SECTION */}
      <div className="mx-2">
        {/* DESKTOP TABLE */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden d-none d-md-block">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-4 py-3">Category Name</th>
                <th>Description</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((cat) => (
                <tr key={cat.id}>
                  <td className="ps-4 py-3 fw-bold">{cat.category_name}</td>
                  <td className="text-muted small">{cat.description || "No description"}</td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-danger border-0" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 size={18} />
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
                  </div>
                  <button className="btn text-danger p-0" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 size={18} />
                  </button>
               </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="text-center p-5 text-muted">No categories found.</div>}
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex justify-content-between align-items-center">
        <div className="text-muted small">{filtered.length} items</div>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setCurrentPage(prev => prev - 1)}><ChevronLeft size={16} /></button>
            </li>
            <li className="page-item disabled"><span className="page-link text-dark">{currentPage}</span></li>
            <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setCurrentPage(prev => prev + 1)}><ChevronRight size={16} /></button>
            </li>
          </ul>
        </nav>
      </div>

      {/* ADD CATEGORY DRAWER */}
      <div className="offcanvas offcanvas-end" id="addCategoryDrawer" style={{ width: "400px" }}>
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