import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "Produce",
    quantity: "",
    unit: "kg",
    unit_price: "",
    reorder_level: "",
    expiry_date: "",
    supplier: "",
    storage_location: "Dry Pantry",
  });

  const closeBtnRef = useRef(null);

  // --- FETCH INVENTORY FROM DATABASE ---
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/inventory");
      // Mapping the expanded database columns
      const mappedData = response.data.map((item) => ({
        id: item.inventory_id,
        name: item.item_name,
        category: item.category,
        stock: item.quantity,
        unit: item.unit,
        price: item.unit_price,
        reorder: item.reorder_level,
        expiry: item.expiry_date,
        supplier: item.supplier,
        location: item.storage_location,
        updated: item.last_updated,
      }));
      setInventory(mappedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (
      (name === "quantity" ||
        name === "unit_price" ||
        name === "reorder_level") &&
      value < 0
    ) {
      setNewItem({ ...newItem, [name]: 0 });
      return;
    }
    setNewItem({ ...newItem, [name]: value });
  };

  // --- ADD TO DATABASE ---
  const handleAddItem = async (e) => {
    const formattedItem = {
      ...newItem,
      unit_price: Math.max(0, parseFloat(newItem.unit_price)),
      // Logic: If unit is pieces or box, force Integer. Otherwise, allow 3 decimal places.
      quantity:
        newItem.unit === "pcs" || newItem.unit === "box"
          ? parseInt(newItem.quantity)
          : parseFloat(parseFloat(newItem.quantity).toFixed(3)),
    };
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/inventory", formattedItem);
      fetchInventory(); // Refresh
      setNewItem({
        item_name: "",
        category: "Produce",
        quantity: "",
        unit: "kg",
        unit_price: "",
        reorder_level: "",
        expiry_date: "",
        supplier: "",
        storage_location: "Dry Pantry",
      });
      if (closeBtnRef.current) closeBtnRef.current.click();
      alert("Inventory updated!");
    } catch (err) {
      alert("Failed to add item to inventory.");
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Remove this item from inventory?")) {
      try {
        await axios.delete(`http://localhost:5000/api/inventory/${id}`);
        setInventory(inventory.filter((item) => item.id !== id));
      } catch (err) {
        alert("Error deleting item.");
      }
    }
  };

  // Helper to check if item is expiring soon (within 3 days)
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const today = new Date();
    const expiry = new Date(date);
    const diff = (expiry - today) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  };

  if (loading) return <div className="p-5 text-center">Loading Stock...</div>;

  return (
    <div className="container-fluid">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Kitchen Inventory</h2>
            <p className="text-muted">Raw materials and stock levels</p>
          </div>
          <button
            className="btn btn-success px-4 shadow-sm"
            data-bs-toggle="offcanvas" // Changed from modal
            data-bs-target="#addInventoryDrawer" // Changed target name
          >
            <i className="bi bi-box-seam me-2"></i>Receive Stock
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Expiry</th>
                  <th>Supplier</th>
                  <th>Location</th>
                  <th>Reorder Level</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, index) => (
                  <tr key={item.id || index}>
                    {/* ID Column */}
                    <td className="ps-4 text-muted">#{item.id}</td>

                    {/* Item Name */}
                    <td>
                      <div className="fw-bold">{item.name}</div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge bg-light text-dark border">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity / Stock */}
                    <td>
                      <span
                        className={
                          item.stock <= item.reorder
                            ? "text-danger fw-bold"
                            : "text-dark"
                        }
                      >
                        {item.stock}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="text-muted">{item.unit}</td>

                    {/* Price */}
                    <td>${Number(item.price).toFixed(2)}</td>

                    {/* Expiry */}
                    <td>
                      <span
                        className={
                          isExpiringSoon(item.expiry)
                            ? "badge bg-danger"
                            : "text-muted small"
                        }
                      >
                        {item.expiry
                          ? new Date(item.expiry).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="small">{item.supplier || "N/A"}</td>

                    {/* Location */}
                    <td className="small">{item.location}</td>

                    {/* Reorder Level */}
                    <td className="text-center">{item.reorder}</td>

                    {/* Last Updated */}
                    <td className="small text-muted">
                      {item.updated
                        ? new Date(item.updated).toLocaleString()
                        : "Never"}
                    </td>

                    {/* Status */}
                    <td>
                      {item.stock <= 0 ? (
                        <span className="badge bg-danger">Out of Stock</span>
                      ) : item.stock <= item.reorder ? (
                        <span className="badge bg-warning text-dark">
                          Low Stock
                        </span>
                      ) : (
                        <span className="badge bg-success">Healthy</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteItem(item.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inventory.length === 0 && (
              <div className="text-center p-5 text-muted">
                No inventory items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ADD INVENTORY SIDE DRAWER --- */}

<div
  className="offcanvas offcanvas-end" // This moves it to the right side
  tabIndex="-1"
  id="addInventoryDrawer" // Match the button target
  aria-labelledby="offcanvasLabel"
  style={{ width: "600px" }} // Give it a bit more width for your 2-column rows
>
  <div className="offcanvas-header border-bottom pt-4 px-4">
    <h5 className="offcanvas-title fw-bold" id="offcanvasLabel">
      Add Raw Stock
    </h5>
    <button
      type="button"
      className="btn-close"
      data-bs-dismiss="offcanvas" // Correct dismiss attribute
      ref={closeBtnRef}
    ></button>
  </div>

  <div className="offcanvas-body px-4">
    <form onSubmit={handleAddItem}>
      {/* Item Name & Category */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Item Name</label>
          <input
            type="text"
            name="item_name"
            className="form-control"
            value={newItem.item_name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Category</label>
          <select
            name="category"
            className="form-select"
            value={newItem.category}
            onChange={handleInputChange}
          >
            <option value="Meat">Meat</option>
            <option value="Dairy">Dairy</option>
            <option value="Produce">Produce</option>
            <option value="Dry Goods">Dry Goods</option>
            <option value="Beverages">Beverages</option>
          </select>
        </div>
      </div>

      {/* Quantity, Unit, & Price */}
      <div className="row">
        <div className="col-md-4 mb-3">
          <label className="form-label small fw-bold">Quantity</label>
          <input
            type="number"
            name="quantity"
            className="form-control"
            value={newItem.quantity}
            onChange={handleInputChange}
            min="0"
            step={newItem.unit === "pcs" || newItem.unit === "box" ? "1" : "0.01"}
            required
          />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label small fw-bold">Unit</label>
          <select
            name="unit"
            className="form-select"
            value={newItem.unit}
            onChange={handleInputChange}
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="L">Liters (L)</option>
            <option value="pcs">Pieces (pcs)</option>
            <option value="box">Boxes</option>
          </select>
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label small fw-bold">Unit Cost (₱)</label>
          <input
            type="number"
            name="unit_price"
            step="0.01"
            min="0"
            className="form-control"
            value={newItem.unit_price}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      {/* Expiry & Reorder */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Expiry Date</label>
          <input
            type="date"
            name="expiry_date"
            className="form-control"
            value={newItem.expiry_date}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Reorder Level</label>
          <input
            type="number"
            name="reorder_level"
            className="form-control"
            value={newItem.reorder_level}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      {/* Supplier & Location */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Supplier</label>
          <input
            type="text"
            name="supplier"
            className="form-control"
            value={newItem.supplier}
            onChange={handleInputChange}
          />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label small fw-bold">Storage Location</label>
          <select
            name="storage_location"
            className="form-select"
            value={newItem.storage_location}
            onChange={handleInputChange}
          >
            <option value="Dry Pantry">Dry Pantry</option>
            <option value="Walk-in Fridge">Walk-in Fridge</option>
            <option value="Freezer">Freezer</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 d-grid gap-2">
        <button type="submit" className="btn btn-success py-2">
          Update Inventory
        </button>
        <button
          type="button"
          className="btn btn-light py-2"
          data-bs-dismiss="offcanvas"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>
    </div>
  );
}

export default Inventory;
