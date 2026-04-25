import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Star, Trash2, Edit3, Search, ChevronLeft, ChevronRight } from "lucide-react";

function Product() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New States
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image: null,
    is_available: 1,
    is_featured: 0,
  });

  const closeBtnRef = useRef(null);
  const offcanvasRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const catRes = await axios.get("http://localhost:5000/api/categories");
      setCategories(catRes.data);

      const menuRes = await axios.get("http://localhost:5000/api/products");
      setMenuItems(menuRes.data);

      if (catRes.data.length > 0 && !isEditing) {
        setNewItem((prev) => ({ ...prev, category_id: catRes.data[0].category_id }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- SEARCH & PAGINATION LOGIC ---
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
    const finalValue = ["is_featured", "is_available", "category_id"].includes(name)
        ? parseInt(value)
        : value;
    setNewItem({ ...newItem, [name]: finalValue });
  };

  const handleFileChange = (e) => {
    setNewItem({ ...newItem, image: e.target.files[0] });
  };

  // --- EDIT MODE LOGIC ---
  const openEditDrawer = (item) => {
    setIsEditing(true);
    setEditId(item.item_id);
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      image: null, // Don't reset the image unless a new one is picked
      is_available: item.is_available,
      is_featured: item.is_featured,
    });
    // The button click triggers Bootstrap Offcanvas
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNewItem({
      name: "",
      description: "",
      price: "",
      category_id: categories[0]?.category_id || "",
      image: null,
      is_available: 1,
      is_featured: 0,
    });
  };

  const handleAddOrUpdateMenuItem = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(newItem).forEach(key => {
        if (newItem[key] !== null) formData.append(key, newItem[key]);
    });

    try {
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/products/${editId}`, formData);
        alert("Item updated successfully!");
      } else {
        await axios.post("http://localhost:5000/api/products", formData);
        alert("Item added successfully!");
      }
      fetchData();
      resetForm();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Error saving menu item.");
    }
  };

  const deleteMenuItem = async (id) => {
    if (window.confirm("Remove this item?")) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        setMenuItems(menuItems.filter((item) => item.item_id !== id));
      } catch (err) {
        alert("Error deleting item.");
      }
    }
  };

  const toggleFeature = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.put(`http://localhost:5000/api/products/${id}/feature`, { is_featured: newStatus });
      setMenuItems(menuItems.map((item) => item.item_id === id ? { ...item, is_featured: newStatus } : item));
    } catch (err) { alert("Error updating status"); }
  };

  if (loading) return <div className="p-5 text-center">Loading Menu...</div>;

  return (
    <div className="container-fluid p-4">
      {/* --- HEADER & SEARCH --- */}
      <div className="row mb-4 align-items-center">
        <div className="col-md-4">
          <h2 className="fw-bold mb-0">Menu Management</h2>
          <p className="text-muted mb-0">Manage digital menu items</p>
        </div>
        <div className="col-md-4">
          <div className="input-group bg-white shadow-sm rounded">
            <span className="input-group-text bg-transparent border-0"><Search size={18} /></span>
            <input 
                type="text" 
                className="form-control border-0" 
                placeholder="Search dishes or categories..." 
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-primary px-4 shadow-sm" data-bs-toggle="offcanvas" data-bs-target="#addMenuDrawer" onClick={resetForm}>
            <i className="bi bi-plus-lg me-2"></i>Add New Dish
          </button>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted">
              <tr>
                <th className="ps-4">Dish</th>
                <th>Category</th>
                <th>Price</th>
                <th>Featured</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.item_id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                        <img
                          src={item.image_url ? `http://localhost:5000${item.image_url}` : "https://via.placeholder.com/45"}
                          alt={item.name}
                          className="rounded me-3"
                          style={{ width: "45px", height: "45px", objectFit: "cover" }}
                          onError={(e) => e.target.src = "https://via.placeholder.com/45"}
                        />
                      <div>
                        <div className="fw-bold">{item.name}</div>
                        <small className="text-muted">{item.description?.substring(0, 30)}...</small>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge bg-light text-dark border">{item.category_name}</span></td>
                  <td className="fw-bold text-success">₱{Number(item.price).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-link p-0" onClick={() => toggleFeature(item.item_id, item.is_featured)}>
                      {item.is_featured ? <Star fill="#ffcc00" color="#ffcc00" size={20} /> : <Star color="#ccc" size={20} />}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${item.is_available ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                      {item.is_available ? "Available" : "Sold Out"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditDrawer(item)} data-bs-toggle="offcanvas" data-bs-target="#addMenuDrawer">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMenuItem(item.item_id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center py-3">
          <small className="text-muted">Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length} entries</small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}><ChevronLeft size={16}/></button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}><ChevronRight size={16}/></button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* --- DRAWER (Used for both Add and Edit) --- */}
      <div className="offcanvas offcanvas-end" tabIndex="-1" id="addMenuDrawer" style={{ width: "500px" }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold">{isEditing ? "Edit Menu Item" : "Add Menu Item"}</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" ref={closeBtnRef} onClick={resetForm}></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAddOrUpdateMenuItem}>
            <div className="mb-3">
              <label className="form-label small fw-bold">Dish Name</label>
              <input type="text" name="name" className="form-control" value={newItem.name} onChange={handleInputChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Description</label>
              <textarea name="description" className="form-control" rows="3" value={newItem.description} onChange={handleInputChange}></textarea>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label small fw-bold">Category</label>
                <select name="category_id" className="form-select" value={newItem.category_id} onChange={handleInputChange} required>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label small fw-bold">Price (₱)</label>
                <input type="number" name="price" step="0.01" className="form-control" value={newItem.price} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Dish Image {isEditing && "(Leave empty to keep current)"}</label>
              <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} required={!isEditing} />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Featured?</label>
              <select name="is_featured" className="form-select" value={newItem.is_featured} onChange={handleInputChange}>
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label small fw-bold">Availability</label>
              <select name="is_available" className="form-select" value={newItem.is_available} onChange={handleInputChange}>
                <option value={1}>Available</option>
                <option value={0}>Sold Out</option>
              </select>
            </div>
            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-primary py-2 fw-bold">{isEditing ? "Save Changes" : "Add to Menu"}</button>
              <button type="button" className="btn btn-light py-2" data-bs-dismiss="offcanvas" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Product;