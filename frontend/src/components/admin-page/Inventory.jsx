import React, { useState, useEffect, useRef } from "react";
import api from "../../api";
import {
  Trash2,
  Package,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Box,
  Edit2,
} from "lucide-react";
import { useToast } from "../ToastContext";

function Inventory() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "Produce",
    quantity: "",
    unit: "kg",
    unit_price: "",
    reorder_level: "",
    expiry_date: "",
    storage_location: "Dry Pantry",
  });

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inventory`);
      const mappedData = response.data.map((item) => ({
        id: item.inventory_id,
        name: item.item_name,
        category: item.category,
        stock: item.quantity,
        unit: item.unit,
        price: item.unit_price,
        reorder: item.reorder_level,
        expiry: item.expiry_date,
        location: item.storage_location,
        updated: item.last_updated,
      }));
      setInventory(mappedData);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const openAddMode = () => {
    setIsEditMode(false);
    setEditItemId(null);
    setNewItem({
      item_name: "",
      category: "Produce",
      quantity: "",
      unit: "kg",
      unit_price: "",
      reorder_level: "",
      expiry_date: "",
      storage_location: "Dry Pantry",
    });
  };

  const openEditMode = (item) => {
    setIsEditMode(true);
    setEditItemId(item.id);

    // Format date string to YYYY-MM-DD for standard html date input
    const formattedExpiry = item.expiry
      ? new Date(item.expiry).toISOString().split("T")[0]
      : "";

    setNewItem({
      item_name: item.name,
      category: item.category,
      quantity: item.stock,
      unit: item.unit,
      unit_price: item.price,
      reorder_level: item.reorder,
      expiry_date: formattedExpiry,
      storage_location: item.location || "Dry Pantry",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await api.put(`/inventory/${editItemId}`, newItem);
      } else {
        await api.post(`/inventory`, newItem);
      }
      fetchInventory();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      showToast(
        isEditMode ? "Failed to update stock." : "Failed to add stock.",
      );
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Remove this item?")) {
      try {
        await api.delete(`/inventory/${id}`);
        fetchInventory();
      } catch (err) {
        showToast("Error deleting item.");
      }
    }
  };

  const isExpired = (date) => {
    if (!date) return false;
    return (
      new Date(date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
    );
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 3 && !isExpired(date);
  };

  const filtered = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const currentItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (loading)
    return (
      <div className="p-5 text-center">
        <RefreshCw className="animate-spin text-primary mx-auto" />
      </div>
    );

  return (
    <div
      className="container-fluid py-3 py-md-4 text-dark bg-light"
      style={{ minHeight: "100vh" }}
    >
      <div className="row g-3 align-items-center mb-4 px-2">
        <div className="col-12 col-lg-4">
          <h2 className="fw-bold mb-0">Kitchen Inventory</h2>
          <p className="text-muted small mb-0">
            Manage raw materials and stock levels
          </p>
        </div>

        <div className="col-12 col-md-8 col-lg-5">
          <div
            className="d-flex align-items-center bg-white rounded-3 border shadow-sm px-3"
            style={{ height: "45px" }}
          >
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* ALIGNED REFRESH & RECEIVE STOCK BUTTON GROUP */}
        <div className="col-12 col-md-4 col-lg-3 d-flex gap-2 align-items-center justify-content-md-end">
          {/* Square Refresh Button */}
          <button
            className="btn btn-light border shadow-sm d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ height: "45px", width: "45px" }}
            onClick={fetchInventory}
            title="Refresh Inventory"
            type="button"
          >
            <RefreshCw size={18} className="text-muted" />
          </button>

          {/* Receive Stock Button matching 45px height */}
          <button
            className="btn btn-primary fw-bold shadow-sm d-flex align-items-center justify-content-center w-100"
            style={{ height: "45px" }}
            data-bs-toggle="offcanvas"
            data-bs-target="#addInvDrawer"
            onClick={openAddMode}
          >
            <Plus size={18} className="me-1 flex-shrink-0" /> Receive Stock
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "1100px" }}
          >
            <thead className="bg-light border-bottom">
              <tr className="text-muted x-small text-uppercase">
                <th className="ps-4 py-3">Item Name</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Unit Cost</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Storage</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.id}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{item.name}</div>
                  </td>
                  <td>
                    <span className="badge bg-white text-dark border fw-normal">
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <div
                      className={`fw-bold ${item.stock <= item.reorder ? "text-danger" : "text-dark"}`}
                    >
                      {item.stock}{" "}
                      <small className="text-muted fw-normal">
                        {item.unit}
                      </small>
                    </div>
                    <div className="x-small text-muted">
                      Reorder at: {item.reorder}
                    </div>
                  </td>
                  <td className="fw-bold text-success">
                    ₱{Number(item.price).toFixed(2)}
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill px-2 py-1 x-small ${
                        item.stock <= 0
                          ? "bg-danger"
                          : isExpired(item.expiry)
                            ? "bg-dark"
                            : item.stock <= item.reorder
                              ? "bg-warning text-dark"
                              : "bg-success"
                      }`}
                    >
                      {item.stock <= 0
                        ? "OUT OF STOCK"
                        : isExpired(item.expiry)
                          ? "EXPIRED"
                          : item.stock <= item.reorder
                            ? "LOW STOCK"
                            : "HEALTHY"}
                    </span>
                  </td>
                  <td>
                    {isExpired(item.expiry) && (
                      <AlertTriangle size={12} className="text-danger me-1" />
                    )}
                    {!isExpired(item.expiry) && isExpiringSoon(item.expiry) && (
                      <AlertTriangle size={12} className="text-warning me-1" />
                    )}
                    <span
                      className={
                        isExpired(item.expiry)
                          ? "text-danger fw-bold"
                          : isExpiringSoon(item.expiry)
                            ? "text-warning fw-bold"
                            : "text-muted small"
                      }
                    >
                      {item.expiry
                        ? new Date(item.expiry).toLocaleDateString()
                        : "---"}
                    </span>
                  </td>
                  <td className="small text-muted">{item.location || "---"}</td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-outline-primary border-0 me-1"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#addInvDrawer"
                      onClick={() => openEditMode(item)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger border-0"
                      onClick={() => deleteItem(item.id)}
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

      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <span className="small text-muted">
          Showing {currentItems.length} of {filtered.length} items
        </span>
        <div className="btn-group shadow-sm bg-white rounded border overflow-hidden">
          <button
            className="btn btn-sm btn-white border-0 px-3"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="btn btn-sm disabled border-0 px-3 text-dark fw-bold bg-white">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            className="btn btn-sm btn-white border-0 px-3"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* DRAWER FOR BOTH ADD & EDIT */}
      <div
        className="offcanvas offcanvas-end border-0 shadow"
        id="addInvDrawer"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold m-0">
            <Box size={20} className="me-2 text-primary" />
            {isEditMode ? "Edit Inventory Stock" : "Receive New Stock"}
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>
        {/*START DRAWER*/}
        <div className="offcanvas-body">
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div className="row g-2">
              <div className="col-12">
                <label className="x-small fw-bold text-muted">ITEM NAME</label>
                <input
                  type="text"
                  name="item_name"
                  value={newItem.item_name}
                  className="form-control"
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-6">
                <label className="x-small fw-bold text-muted">CATEGORY</label>
                <select
                  name="category"
                  value={newItem.category}
                  className="form-select"
                  onChange={handleInputChange}
                >
                  <option value="Meat">Meat</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Produce">Produce</option>
                  <option value="Dry Goods">Dry Goods</option>
                </select>
              </div>
              <div className="col-6">
                <label className="x-small fw-bold text-muted">STORAGE</label>
                <select
                  name="storage_location"
                  value={newItem.storage_location}
                  className="form-select"
                  onChange={handleInputChange}
                >
                  <option value="Dry Pantry">Dry Pantry</option>
                  <option value="Fridge">Fridge</option>
                  <option value="Freezer">Freezer</option>
                </select>
              </div>
            </div>
            <div className="row g-2">
              <div className="col-4">
                <label className="x-small fw-bold text-muted">QTY</label>
                <input
                  type="number"
                  name="quantity"
                  value={newItem.quantity}
                  className="form-control"
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    // Only allow numbers 1 and above
                    if (e.target.value === "") {
                      setNewItem({ ...newItem, quantity: "" });
                    } else if (val >= 1) {
                      setNewItem({ ...newItem, quantity: val });
                    }
                  }}
                  required
                  min="1"
                  step="1"
                  onKeyDown={(e) => {
                    // Prevent minus sign, 'e', 'E' (exponent), and '.' (decimal)
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "E" ||
                      e.key === "."
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    // If empty or 0, set to 1
                    const val = parseInt(e.target.value);
                    if (!e.target.value || val < 1) {
                      setNewItem({ ...newItem, quantity: 1 });
                    }
                  }}
                />
              </div>
              <div className="col-4">
                <label className="x-small fw-bold text-muted">UNIT</label>
                <select
                  name="unit"
                  value={newItem.unit}
                  className="form-select"
                  onChange={handleInputChange}
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pcs">pcs</option>
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="cup">cup</option>
                </select>
              </div>
              <div className="col-4">
                <label className="x-small fw-bold text-muted">COST (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  name="unit_price"
                  value={newItem.unit_price}
                  className="form-control"
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <label className="x-small fw-bold text-muted">
                  EXPIRY DATE
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={newItem.expiry_date}
                  className="form-control"
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-6">
                <label className="x-small fw-bold text-muted">
                  REORDER LVL
                </label>
                <input
                  type="number"
                  name="reorder_level"
                  value={newItem.reorder_level}
                  className="form-control"
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="mt-2">
              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
              >
                {isEditMode ? "Save Changes" : "Save to Inventory"}
              </button>
              <button
                type="button"
                className="btn btn-light w-100 mt-2 py-2 fw-bold border"
                data-bs-dismiss="offcanvas"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`.x-small { font-size: 0.65rem; letter-spacing: 0.5px; } .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Inventory;
