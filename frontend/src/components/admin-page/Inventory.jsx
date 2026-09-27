import React, { useState, useEffect, useRef, useMemo } from "react";
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
  // Filter controls.
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  const resetPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setCategoryFilter("all");
    setStockFilter("all");
    resetPage();
  };

  const hasActiveFilters = categoryFilter !== "all" || stockFilter !== "all";

  const categoryNames = useMemo(
    () =>
      Array.from(
        new Set(
          inventory.map((i) => i.category).filter((c) => !!c && String(c).trim() !== ""),
        ),
      ).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
      ),
    [inventory],
  );

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

  // Dish links defined while adding a new raw material, so the recipe is
  // captured once at the moment the item is stocked instead of being chased
  // later in Recipe Manager.
  const [recipeLinks, setRecipeLinks] = useState([]);
  const [linkItemId, setLinkItemId] = useState("");
  const [linkQty, setLinkQty] = useState("");
  const [menuItems, setMenuItems] = useState([]);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchInventory();
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await api.get(`/products`);
      setMenuItems(res.data || []);
    } catch (err) {
      console.error("Error fetching menu items:", err);
    }
  };

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
        dishes: item.dishes || [],
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
    setRecipeLinks([]);
    setLinkItemId("");
    setLinkQty("");
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

  const addRecipeLink = () => {
    const qty = parseFloat(linkQty);
    if (!linkItemId || isNaN(qty) || qty <= 0) {
      showToast("Pick a dish and enter how much is used per serving.");
      return;
    }
    const chosen = menuItems.find((m) => String(m.item_id) === String(linkItemId));
    if (recipeLinks.some((l) => String(l.item_id) === String(linkItemId))) {
      showToast("That dish is already linked. Adjust the quantity below.");
      return;
    }
    setRecipeLinks((prev) => [
      ...prev,
      { item_id: parseInt(linkItemId, 10), quantity_required: qty, name: chosen?.menu_name || "" },
    ]);
    setLinkItemId("");
    setLinkQty("");
  };

  const removeRecipeLink = (itemId) => {
    setRecipeLinks((prev) => prev.filter((l) => l.item_id !== itemId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await api.put(`/inventory/${editItemId}`, newItem);
      } else {
        await api.post(`/inventory`, {
          ...newItem,
          recipeLinks: recipeLinks.map((l) => ({
            item_id: l.item_id,
            quantity_required: l.quantity_required,
          })),
        });
        if (recipeLinks.length > 0) {
          showToast(
            `Saved with ${recipeLinks.length} dish recipe(s) linked.`,
            "success",
          );
        }
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

  // Sorted A-Z so items are easy to find. The backend orders by stock
  // urgency (out of stock first), which is useful for restocking alerts but
  // makes the list hard to scan for a specific ingredient.
  const filtered = inventory
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      if (
        term &&
        !item.name.toLowerCase().includes(term) &&
        !item.category.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (stockFilter !== "all") {
        const out = item.stock <= 0;
        const low = !out && item.stock <= item.reorder;
        const expired = isExpired(item.expiry);
        if (stockFilter === "out" && !out) return false;
        if (stockFilter === "low" && !low) return false;
        if (stockFilter === "expired" && !expired) return false;
        if (stockFilter === "ok" && (out || low || expired)) return false;
      }
      return true;
    })
    .sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      }),
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
      className="inventory-container container-fluid py-3 py-md-4 text-dark bg-light"
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

      {/* FILTER BAR */}
      <div className="col-12 d-flex flex-wrap gap-2 align-items-center mb-3 px-2">
        <select
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            resetPage();
          }}
        >
          <option value="all">All categories</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            resetPage();
          }}
        >
          <option value="all">Any stock level</option>
          <option value="out">Out of stock</option>
          <option value="low">Low stock</option>
          <option value="expired">Expired</option>
          <option value="ok">Stocked / OK</option>
        </select>

        {hasActiveFilters && (
          <button
            className="btn btn-sm btn-link text-decoration-none px-0"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
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
                <th>Used in Dishes</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Storage</th>
                <th className="text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.id}>
                  <td className="ps-4" data-label="Item Name">
                    <div className="fw-bold text-dark">{item.name}</div>
                  </td>
                  <td data-label="Category">
                    <span className="badge bg-white text-dark border fw-normal">
                      {item.category}
                    </span>
                  </td>
                  <td data-label="Stock Level">
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
                  <td className="fw-bold text-success" data-label="Unit Cost">
                    ₱{Number(item.price).toFixed(2)}
                  </td>
                  <td data-label="Used in Dishes">
                    {item.dishes && item.dishes.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {item.dishes.slice(0, 3).map((d) => (
                          <span
                            key={d.name}
                            className="badge bg-light text-dark border fw-normal"
                            title={`${d.quantity_required} ${item.unit} per serving`}
                          >
                            {d.name}
                          </span>
                        ))}
                        {item.dishes.length > 3 && (
                          <span
                            className="badge bg-light text-muted border fw-normal"
                            title={item.dishes.slice(3).map((d) => d.name).join(", ")}
                          >
                            +{item.dishes.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted x-small">
                        Not linked to any dish
                      </span>
                    )}
                  </td>
                  <td data-label="Status">
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
                  <td data-label="Expiry">
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
                  <td className="small text-muted" data-label="Storage">
                    {item.location || "---"}
                  </td>
                  <td className="text-end pe-4" data-label="Action">
                    <div className="d-inline-flex">
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
                    </div>
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
                  {/*
                    Value is the short code stored in the database; the label is
                    plain English so staff who are not developers know what to
                    pick. "kilogram (kg)" is understandable, "kg" alone is not.
                  */}
                  <optgroup label="Weight">
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="lb">Pound (lb)</option>
                    <option value="oz">Ounce (oz)</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="L">Liter (L)</option>
                    <option value="mL">Milliliter (mL)</option>
                    <option value="cup">Cup</option>
                    <option value="tbsp">Tablespoon (tbsp)</option>
                    <option value="tsp">Teaspoon (tsp)</option>
                    <option value="gal">Gallon (gal)</option>
                  </optgroup>
                  <optgroup label="Count">
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="sachet">Sachet / Pack</option>
                    <option value="can">Can</option>
                    <option value="bottle">Bottle</option>
                    <option value="box">Box</option>
                    <option value="tray">Tray</option>
                    <option value="dozen">Dozen</option>
                    <option value="bunch">Bunch</option>
                    <option value="head">Head</option>
                    <option value="slice">Slice</option>
                    <option value="stick">Stick</option>
                    <option value="roll">Roll</option>
                    <option value="bag">Bag</option>
                    <option value="set">Set</option>
                  </optgroup>
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
            {/* DISH RECIPE LINKS — capture the recipe as the item is stocked */}
            {!isEditMode && (
              <div className="border rounded-3 p-3 mt-3 bg-light">
                <label className="x-small fw-bold text-muted d-block mb-1">
                  USED IN THESE DISHES (OPTIONAL)
                </label>
                <p className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Link this raw material to dishes now so you never have to
                  set the recipe up later.
                </p>

                {recipeLinks.length > 0 && (
                  <div className="mb-2">
                    {recipeLinks.map((l) => (
                      <div
                        key={l.item_id}
                        className="d-flex justify-content-between align-items-center bg-white border rounded-2 px-2 py-1 mb-1"
                      >
                        <span className="small fw-semibold text-dark">
                          {l.name}
                        </span>
                        <span className="d-flex align-items-center gap-2">
                          <span className="small text-muted">
                            {l.quantity_required} {newItem.unit || "unit"} /
                            serving
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 border-0"
                            onClick={() => removeRecipeLink(l.item_id)}
                            title="Remove this link"
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="row g-2">
                  <div className="col-12 col-sm-7">
                    <select
                      className="form-select form-select-sm"
                      value={linkItemId}
                      onChange={(e) => setLinkItemId(e.target.value)}
                    >
                      <option value="">-Select Dish-</option>
                      {menuItems
                        .filter(
                          (m) =>
                            !recipeLinks.some((l) => l.item_id === m.item_id),
                        )
                        .slice()
                        .sort((a, b) =>
                          String(a.menu_name || "").localeCompare(
                            String(b.menu_name || ""),
                            undefined,
                            { sensitivity: "base" },
                          ),
                        )
                        .map((m) => (
                          <option key={m.item_id} value={m.item_id}>
                            {m.menu_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-8 col-sm-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control form-control-sm"
                      placeholder="Qty / serving"
                      value={linkQty}
                      onChange={(e) => setLinkQty(e.target.value)}
                    />
                  </div>
                  <div className="col-4 col-sm-2 d-grid">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm fw-bold"
                      onClick={addRecipeLink}
                      title="Add this dish link"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

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

<style>{`.x-small { font-size: 0.65rem; letter-spacing: 0.5px; } .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .inventory-container .table-responsive { overflow: visible; }
          .inventory-container thead { display: none; }
          .inventory-container .table, .inventory-container .table tbody, .inventory-container .table tr, .inventory-container .table td { display: block; width: 100%; min-width: 0; }
          .inventory-container .table { min-width: 0 !important; }
          .inventory-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .inventory-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .inventory-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .inventory-container .table td[data-label="Item Name"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .inventory-container .table td[data-label="Item Name"]::before { display: none; }
        }
      `}</style>
    </div>
  );
}

export default Inventory;
