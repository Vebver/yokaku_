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
  X,
} from "lucide-react";
import { useToast } from "../ToastContext";
import { useSectionRefresh } from "../shared/sectionRefresh";
import { useConfirmation } from "../ConfirmationContext";
import "../../Style/Inventory.css";

function Inventory() {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
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

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchInventory();
    fetchMenuItems();
  });

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
    if (!(await confirm({
      title: "Remove inventory item",
      message: "Remove this item from inventory?",
      confirmLabel: "Remove item",
    }))) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err) {
      showToast("Error deleting item.");
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

  // Single source of truth for an item's health. The stock number, the status
  // pill and the summary tiles all read from this, so they can never disagree
  // (they previously each had their own copy of the same nested ternary).
  const statusOf = (item) => {
    const stock = Number(item.stock);
    const reorder = Number(item.reorder);
    if (stock <= 0) return "out";
    if (isExpired(item.expiry)) return "expired";
    if (!Number.isNaN(reorder) && stock <= reorder) return "low";
    return "ok";
  };

  const STATUS_META = {
    out: { label: "Out of stock", badge: "bg-danger", text: "text-danger" },
    expired: { label: "Expired", badge: "bg-dark", text: "text-dark" },
    low: { label: "Low stock", badge: "bg-warning text-dark", text: "text-warning" },
    ok: { label: "Healthy", badge: "bg-success", text: "text-success" },
  };

  // Urgency first (things to reorder float to the top), then A-Z within a
  // group so the list stays predictable.
  const URGENCY_RANK = { out: 0, expired: 1, low: 2, ok: 3 };

  const filtered = inventory
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      if (
        term &&
        !String(item.name || "").toLowerCase().includes(term) &&
        !String(item.category || "").toLowerCase().includes(term)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (stockFilter !== "all") {
        const s = statusOf(item);
        // "expiring soon" is surfaced as a warning icon rather than its own
        // filter bucket, so it is treated as OK here.
        if (stockFilter === s) return true;
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const rank = URGENCY_RANK[statusOf(a)] - URGENCY_RANK[statusOf(b)];
      if (rank !== 0) return rank;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    });

  // Counts across the whole inventory, so the tiles stay stable while filters
  // are applied.
  const statusCounts = useMemo(() => {
    const counts = { out: 0, low: 0, expired: 0, ok: 0 };
    inventory.forEach((i) => {
      counts[statusOf(i)] += 1;
    });
    return counts;
  }, [inventory]);

  const currentItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Reset to the first page whenever the result set shrinks past the current
  // page, otherwise the table renders empty with no way back.
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
      {/* HEADER */}
      <div className="row g-3 align-items-center mb-3 px-2">
        <div className="col-12">
          <h2 className="fw-bold mb-0">Kitchen Inventory</h2>
          <p className="text-muted small mb-0">
            Manage raw materials and stock levels
          </p>
        </div>
      </div>

      {/* SEARCH + FILTERS â€” full width so everything sits on one line and only
          wraps on phones, instead of stacking inside a narrow column. */}
      <div className="admin-toolbar row g-2 align-items-center mb-3 px-2">
        <div className="col-12 col-xl-5 col-xxl-4">
          <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3">
            <Search size={18} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              placeholder="Search inventory items..."
              aria-label="Search inventory items"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="col-12 col-xl-7 col-xxl-8">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              className="btn btn-primary admin-toolbar-button fw-bold shadow-sm d-inline-flex align-items-center justify-content-center order-first"
              data-bs-toggle="offcanvas"
              data-bs-target="#addInvDrawer"
              onClick={openAddMode}
            >
              <Plus size={18} className="me-1 flex-shrink-0" /> Receive Stock
            </button>
            <select
              className="form-select form-select-sm flex-grow-1 flex-sm-grow-0"
              style={{ width: "auto", minWidth: "150px", height: "38px" }}
              aria-label="Filter by category"
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
              className="form-select form-select-sm flex-grow-1 flex-sm-grow-0"
              style={{ width: "auto", minWidth: "150px", height: "38px" }}
              aria-label="Filter by stock level"
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
              <option value="ok">Healthy</option>
            </select>

            {hasActiveFilters && (
              <button
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 fw-bold"
                style={{ height: "38px" }}
                onClick={clearFilters}
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STATUS SUMMARY â€” click a tile to filter to that bucket */}
      <div className="row g-2 px-2 mb-3">
        {[
          { key: "out", label: "Out of stock", tone: "danger" },
          { key: "low", label: "Low stock", tone: "warning" },
          { key: "expired", label: "Expired", tone: "dark" },
          { key: "ok", label: "Healthy", tone: "success" },
        ].map((tile) => {
          const isActive = stockFilter === tile.key;
          return (
            <div className="col-6 col-md-3" key={tile.key}>
              <button
                type="button"
                onClick={() => {
                  setStockFilter(isActive ? "all" : tile.key);
                  resetPage();
                }}
                aria-pressed={isActive}
                className={`inv-stat-card w-100 text-start border-0 shadow-sm rounded-3 p-3 inv-stat-${tile.tone} ${
                  isActive ? "is-active" : ""
                }`}
              >
                <div className="inv-stat-value">{statusCounts[tile.key]}</div>
                <div className="inv-stat-label text-muted small fw-bold">
                  {tile.label}
                </div>
              </button>
            </div>
          );
        })}
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
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    <Package size={40} className="text-muted opacity-25 mb-2" />
                    <p className="fw-bold text-dark mb-1">
                      {inventory.length === 0
                        ? "No inventory yet"
                        : "No items match your filters"}
                    </p>
                    <p className="text-muted small mb-3">
                      {inventory.length === 0
                        ? "Receive your first stock to start tracking ingredients."
                        : "Try a different search term or clear the filters."}
                    </p>
                    {inventory.length > 0 && (
                      <button
                        className="btn btn-sm btn-outline-secondary fw-bold"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const status = statusOf(item);
                  const meta = STATUS_META[status];
                  const stock = Number(item.stock);
                  const reorder = Number(item.reorder);
                  // Bar fills relative to the reorder point; anything at or
                  // below it reads as a nearly-empty bar.
                  const barPct =
                    !Number.isNaN(reorder) && reorder > 0
                      ? Math.max(4, Math.min(100, (stock / (reorder * 2)) * 100))
                      : stock > 0
                        ? 100
                        : 0;

                  return (
                  <tr key={item.id} className={status === "out" ? "table-danger-row" : ""}>
                  <td className="ps-4" data-label="Item Name">
                    <div className="fw-bold text-dark">{item.name}</div>
                  </td>
                  <td data-label="Category">
                    <span className="badge bg-white text-dark border fw-normal">
                      {item.category || "Uncategorised"}
                    </span>
                  </td>
                  <td data-label="Stock Level">
                    <div
                      className={`fw-bold ${status === "ok" ? "text-dark" : "text-danger"}`}
                    >
                      {item.stock}{" "}
                      <small className="text-muted fw-normal">
                        {item.unit}
                      </small>
                    </div>
                    <div
                      className="stock-bar mt-1"
                      role="img"
                      aria-label={`${item.stock} ${item.unit} in stock`}
                    >
                      <div
                        className={`stock-bar-fill stock-${status}`}
                        style={{ width: `${barPct}%` }}
                      ></div>
                    </div>
                    <div className="x-small text-muted">
                      Reorder at: {item.reorder}
                    </div>
                  </td>
                  <td className="fw-bold text-success" data-label="Unit Cost">
                    {"\u20B1"}
                    {Number(item.price || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td data-label="Used in Dishes">
                    {item.dishes && item.dishes.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1 justify-content-md-start justify-content-end">
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
                      className={`badge rounded-pill px-2 py-1 x-small ${meta.badge}`}
                    >
                      {meta.label.toUpperCase()}
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
                        title={`Edit ${item.name}`}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger border-0"
                        onClick={() => deleteItem(item.id)}
                        title={`Delete ${item.name}`}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <span className="small text-muted">
          Showing{" "}
          <strong>
            {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </strong>
          {"\u2013"}
          <strong>
            {Math.min(currentPage * itemsPerPage, filtered.length)}
          </strong>{" "}
          of <strong>{filtered.length}</strong> items
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
                <label className="x-small fw-bold text-muted">COST (â‚±)</label>
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
            {/* DISH RECIPE LINKS â€” capture the recipe as the item is stocked */}
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

    </div>
  );
}

export default Inventory;
