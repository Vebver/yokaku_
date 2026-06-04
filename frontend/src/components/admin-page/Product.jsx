import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Star, Trash2, Edit3, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function Product() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [newItem, setNewItem] = useState({
    name: "", description: "", price: "", category_id: "",
    image: null, is_available: 1, is_featured: 0,
  });

  const closeBtnRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, menuRes] = await Promise.all([
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/products`)
      ]);
      setCategories(catRes.data);
      setMenuItems(menuRes.data.sort((a, b) => b.item_id - a.item_id));
      if (catRes.data.length > 0 && !isEditing) {
        setNewItem(prev => ({ ...prev, category_id: catRes.data[0].category_id }));
      }
    } catch (err) { 
      console.error(err); 
      alert("Error loading menu data. Please try refreshing the page.");
    } 
    finally { setLoading(false); }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: ["is_featured", "is_available", "category_id"].includes(name) ? parseInt(value) : value });
  };

  const openEditDrawer = (item) => {
    setIsEditing(true);
    setEditId(item.item_id);
    setNewItem({
      name: item.name, description: item.description, price: item.price,
      category_id: item.category_id, image: null, is_available: item.is_available,
      is_featured: item.is_featured, local_path: item.local_path, image_url: item.image_url,
    });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNewItem({ name: "", description: "", price: "", category_id: categories[0]?.category_id || "", image: null, is_available: 1, is_featured: 0 });
  };

  const handleAddOrUpdateMenuItem = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const formData = new FormData();
    Object.keys(newItem).forEach((key) => {
      if (newItem[key] !== null) formData.append(key, newItem[key]);
    });

    try {
      if (isEditing) {
        await axios.put(`${API_BASE}/products/${editId}`, formData, config);
        alert("Dish updated successfully!");
      } else {
        await axios.post(`${API_BASE}/products`, formData, config);
        alert("New dish added successfully!");
      }
      
      fetchData();
      resetForm();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error saving item. Check if you are logged in.");
    }
  };

  const deleteMenuItem = async (id) => {
    if (window.confirm("Remove item?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE}/products/${id}`, {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        });

        alert("Dish deleted successfully!");
        fetchData(); 
      } catch (err) {
        console.error(err);
        alert("Error deleting item. Please check your connection or authorization.");
      }
    }
  };

  const toggleFeature = async (id, currentStatus) => {
    try { 
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.put(`${API_BASE}/products/${id}/feature`, { is_featured: newStatus }, config); 
      
      // Success Alert
      alert(newStatus === 1 ? "Added to featured items!" : "Removed from featured items!");
      fetchData(); 
    } 
    catch (err) { 
      console.error(err);
      alert("Error updating featured status. Please check if you are logged in."); 
    }
  };

  const getImageUrl = (item, BASE_URL) => {
    if (item.image instanceof File) return URL.createObjectURL(item.image);
    const path = item.local_path || item.image_url;
    if (!path) return "https://placehold.co/150?text=No+Image";
    return path.startsWith("http") ? path : `${BASE_URL}/${path.replace(/^\//, "")}`;
  };

  if (loading) return <div className="p-5 text-center">Loading Menu...</div>;

  return (
    <div className="container-fluid p-3 p-md-4 bg-light">
      {/* HEADER */}
      <div className="row g-3 align-items-center mb-4">
        <div className="col-12 col-lg-4">
          <h2 className="fw-bold mb-0">Menu Items</h2>
          <p className="text-muted mb-0 small">Digital menu items</p>
        </div>

        <div className="col-12 col-md-8 col-lg-5">
          <div className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3" style={{ height: '48px' }}>
            <Search size={20} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              style={{ color: "#212529", fontSize: "16px", fontWeight: "500", height: "100%" }}
              placeholder="Search dishes or categories..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="col-12 col-md-4 col-lg-3 text-md-end">
          <button className="btn btn-primary w-100 w-md-auto px-4 py-2 fw-bold" data-bs-toggle="offcanvas" data-bs-target="#addMenuDrawer" onClick={resetForm}>
            <Plus size={18} className="me-1" /> Add New Dish
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm border-0" style={{ borderRadius: "12px" }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '600px' }}>
            <thead className="table-light">
              <tr>
                <th className="ps-4 py-3 small text-uppercase text-muted">Dish</th>
                <th className="small text-uppercase text-muted">Category</th>
                <th className="small text-uppercase text-muted">Price</th>
                <th className="small text-uppercase text-muted text-center">Featured</th>
                <th className="small text-uppercase text-muted">Status</th>
                <th className="text-end pe-4 small text-uppercase text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.item_id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center py-2">
                      <img src={getImageUrl(item, BASE_URL)} alt="" className="rounded shadow-sm me-3 border" width="48" height="48" style={{ objectFit: "cover" }} />
                      <div>
                        <div className="fw-bold text-dark lh-1 mb-1">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge bg-light text-dark border fw-normal">{item.category_name}</span></td>
                  <td className="fw-bold text-success">₱{Number(item.price).toFixed(2)}</td>
                  <td className="text-center">
                    <button className="btn btn-link p-0" onClick={() => toggleFeature(item.item_id, item.is_featured)}>
                      <Star fill={item.is_featured ? "#ffcc00" : "none"} color={item.is_featured ? "#ffcc00" : "#cbd5e1"} size={20} />
                    </button>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-2 small ${item.is_available ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                      {item.is_available ? "Available" : "Sold Out"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-2">
                      <button className="btn btn-sm btn-outline-primary shadow-sm" onClick={() => openEditDrawer(item)} data-bs-toggle="offcanvas" data-bs-target="#addMenuDrawer"><Edit3 size={16} /></button>
                      <button className="btn btn-sm btn-outline-danger shadow-sm" onClick={() => deleteMenuItem(item.item_id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, filteredItems.length)}</strong> of <strong>{filteredItems.length}</strong> items
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link border-0 text-dark fw-bold px-3 py-2 bg-white">
                Page {currentPage} of {totalPages || 1}
              </span>
            </li>
            <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= totalPages}>
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* DRAWER */}
      <div className="offcanvas offcanvas-end shadow" tabIndex="-1" id="addMenuDrawer" style={{ width: "min(100%, 450px)" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold mb-0">{isEditing ? "Edit Menu Item" : "Add New Dish"}</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef}></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAddOrUpdateMenuItem}>
            <div className="mb-3">
              <label className="form-label small fw-bold">Dish Name</label>
              <input type="text" name="name" className="form-control" value={newItem.name} onChange={handleInputChange} required />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-bold">Category</label>
                <select name="category_id" className="form-select" value={newItem.category_id} onChange={handleInputChange} required>
                  {categories.map((cat) => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold">Price (₱)</label>
                <input type="number" name="price" step="0.01" className="form-control" value={newItem.price} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="mb-4 text-center">
               <div className="bg-light p-3 rounded border mb-2">
                  <img src={getImageUrl(newItem, BASE_URL)} alt="Preview" className="img-thumbnail" style={{ height: "140px", width: "100%", objectFit: "cover" }} />
               </div>
               <input type="file" className="form-control" accept="image/*" onChange={(e) => setNewItem({ ...newItem, image: e.target.files[0] })} />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold shadow-sm">{isEditing ? "Update Dish" : "Add to Menu"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Product;