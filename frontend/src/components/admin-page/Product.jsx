import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Star,
  Trash2,
  Edit3,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
function Product() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const catRes = await axios.get(`${API_BASE}/categories`);
      setCategories(catRes.data);
      const menuRes = await axios.get(`${API_BASE}/products`);
      setMenuItems(menuRes.data);
      if (catRes.data.length > 0 && !isEditing) {
        setNewItem((prev) => ({
          ...prev,
          category_id: catRes.data[0].category_id,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: ["is_featured", "is_available", "category_id"].includes(name)
        ? parseInt(value)
        : value,
    });
  };

  const handleFileChange = (e) => {
    setNewItem({ ...newItem, image: e.target.files[0] });
  };

  const openEditDrawer = (item) => {
    setIsEditing(true);
    setEditId(item.item_id);
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      image: null,
      is_available: item.is_available,
      is_featured: item.is_featured,
    });
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
    Object.keys(newItem).forEach((key) => {
      if (newItem[key] !== null) formData.append(key, newItem[key]);
    });
    try {
      if (isEditing)
        await axios.put(`${API_BASE}/products/${editId}`, formData);
      else await axios.post(`${API_BASE}/products`, formData);
      fetchData();
      resetForm();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      alert("Error saving item.");
    }
  };

  const deleteMenuItem = async (id) => {
    if (window.confirm("Remove item?")) {
      try {
        await axios.delete(`${API_BASE}/products/${id}`);
        fetchData();
      } catch (err) {
        alert("Error.");
      }
    }
  };

  const toggleFeature = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await axios.put(`${API_BASE}/products/${id}/feature`, {
        is_featured: newStatus,
      });
      fetchData();
    } catch (err) {
      alert("Error.");
    }
  };

  if (loading)
    return <div className="p-5 text-center text-dark">Loading...</div>;

  return (
    <div className="container-fluid p-4 bg-light" id="admin-product-page">
      {/* THE CSS "ISOLATION" BLOCK */}
      <style>
        {`
    /* 1. FORCE HORIZONTAL LAYOUT */
    #admin-product-page .search-box-container {
      display: flex !important;
      flex-direction: row !important; /* Forces icon and input to be side-by-side */
      align-items: center !important;
      background-color: #ffffff !important;
      border: 1px solid #ced4da !important;
      width: 100% !important;
    }

    /* 2. MAKE INPUT FILL THE REMAINING SPACE */
    #admin-product-page .form-control {
      flex: 1 !important; /* Takes up all space next to the icon */
      border: none !important;
      background: transparent !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      height: 40px !important;
      padding-left: 10px !important;
    }

    #admin-product-page .input-group-text {
      background: transparent !important;
      border: none !important;
      padding-right: 0 !important;
      color: #333 !important;
    }

    /* 3. RESPONSIVE HEADER FIX */
    @media (max-width: 768px) {
      #admin-product-page .header-wrapper {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1rem !important;
      }
      #admin-product-page .search-box-wrapper {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
      }
    }
  `}
      </style>

      {/* --- HEADER & SEARCH --- */}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-3">
        <div className="flex-shrink-0">
          <h2 className="fw-bold mb-0">Menu Management</h2>
          <p className="text-muted mb-0">Manage digital menu items</p>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-grow-1 d-flex justify-content-center mx-4">
          <div className="input-group shadow-sm rounded-3 search-box-container">
            <span className="input-group-text">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search dishes or categories..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            className="btn btn-primary px-4 py-2 fw-bold"
            data-bs-toggle="offcanvas"
            data-bs-target="#addMenuDrawer"
          >
            + Add New Dish
          </button>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div
        className="card shadow-sm border-0 overflow-hidden"
        style={{ borderRadius: "12px" }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr style={{ height: "60px" }}>
                <th className="ps-4 small fw-bold text-uppercase text-muted">
                  Dish
                </th>
                <th className="small fw-bold text-uppercase text-muted">
                  Category
                </th>
                <th className="small fw-bold text-uppercase text-muted">
                  Price
                </th>
                <th className="small fw-bold text-uppercase text-muted">
                  Featured
                </th>
                <th className="small fw-bold text-uppercase text-muted">
                  Status
                </th>
                <th className="text-end pe-4 small fw-bold text-uppercase text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.item_id} style={{ height: "80px" }}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <img
                        src={
                          item.image_url
                            ? `${BASE_URL}${item.image_url}`
                            : "https://via.placeholder.com/45"
                        }
                        alt={item.name}
                        className="rounded shadow-sm border me-3"
                        width="45"
                        height="45"
                        style={{ objectFit: "cover" }}
                      />
                      <div>
                        <div className="fw-bold text-dark">{item.name}</div>
                        <div
                          className="text-muted x-small"
                          style={{ fontSize: "0.75rem" }}
                        >
                          ID: {item.item_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      {item.category_name}
                    </span>
                  </td>
                  <td className="fw-bold text-success">
                    ₱{Number(item.price).toFixed(2)}
                  </td>
                  <td>
                    <button
                      className="btn btn-link p-0"
                      onClick={() =>
                        toggleFeature(item.item_id, item.is_featured)
                      }
                    >
                      {item.is_featured ? (
                        <Star fill="#ffcc00" color="#ffcc00" size={20} />
                      ) : (
                        <Star color="#ccc" size={20} />
                      )}
                    </button>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill px-3 py-2 ${item.is_available ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}
                    >
                      {item.is_available ? "Available" : "Sold Out"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => openEditDrawer(item)}
                      data-bs-toggle="offcanvas"
                      data-bs-target="#addMenuDrawer"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteMenuItem(item.item_id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION SECTION */}
      <div className="d-flex justify-content-between align-items-center mt-4 px-2">
        <span className="text-muted small">
          Showing {indexOfFirstItem + 1} to{" "}
          {Math.min(indexOfLastItem, filteredItems.length)} of{" "}
          {filteredItems.length}
        </span>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* DRAWER (Used for Add/Edit) */}
      <div
        className="offcanvas offcanvas-end shadow"
        tabIndex="-1"
        id="addMenuDrawer"
        style={{ width: "500px" }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="fw-bold text-dark mb-0">
            {isEditing ? "Edit Menu Item" : "Add Menu Item"}
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
            onClick={resetForm}
          ></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAddOrUpdateMenuItem}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">
                Dish Name
              </label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={newItem.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">
                Description
              </label>
              <textarea
                name="description"
                className="form-control"
                rows="3"
                value={newItem.description}
                onChange={handleInputChange}
              ></textarea>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label small fw-bold text-dark">
                  Category
                </label>
                <select
                  name="category_id"
                  className="form-select"
                  value={newItem.category_id}
                  onChange={handleInputChange}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label small fw-bold text-dark">
                  Price (₱)
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  className="form-control"
                  value={newItem.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">
                Image {isEditing && "(Keep empty for no change)"}
              </label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleFileChange}
                required={!isEditing}
              />
            </div>
            <div className="d-grid gap-2 mt-4">
              <button type="submit" className="btn btn-primary py-2 fw-bold">
                {isEditing ? "Save Changes" : "Add to Menu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Product;
