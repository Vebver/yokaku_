import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../../api";
import {
  Trash2,
  Package,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
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
import "../../Style/KitchenNavbar.css";

const KitchenInventoryHeader = ({ onBack }) => (
  <nav className="kitchen-navbar kitchen-inventory-navbar">
    <div className="nav-left">
        <div>
          <h1 className="brand-name">HANGOUT KITCHEN</h1>
        </div>
    </div>
    <div className="nav-right">
      <button className="kitchen-nav-back" onClick={onBack}>
        <ArrowLeft size={18} /> BACK TO KITCHEN
      </button>
    </div>
  </nav>
);

function Inventory({ isKitchenStaff = false, onBack }) {
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
  // later in Recipe Manager. In edit mode the same links are loaded from the
  // database and saved straight through the dish-link API.
  const [recipeLinks, setRecipeLinks] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  // ==================== LINK DISHES MODAL ====================
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishModalLoading, setDishModalLoading] = useState(false);
  const [dishModalSaving, setDishModalSaving] = useState(false);
  const [dishModalLinks, setDishModalLinks] = useState([]);
  const [dishLinkId, setDishLinkId] = useState("");
  const [dishLinkQty, setDishLinkQty] = useState("");
  const [dishSearch, setDishSearch] = useState("");

  // ==================== DYNAMIC UNITS & STORAGE LOCATIONS ====================
  const [unitOptions, setUnitOptions] = useState([]);
  const [storageOptions, setStorageOptions] = useState([]);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [showNewStorage, setShowNewStorage] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitGroup, setNewUnitGroup] = useState("Count");
  const [newStorageName, setNewStorageName] = useState("");
  const [savingOption, setSavingOption] = useState(false);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchInventory();
    fetchMenuItems();
    fetchUnitOptions();
    fetchStorageOptions();
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchInventory();
    fetchMenuItems();
    fetchUnitOptions();
    fetchStorageOptions();
  });

  const fetchUnitOptions = async () => {
    try {
      const res = await api.get(`/inventory/units`);
      setUnitOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching unit options:", err);
    }
  };

  const fetchStorageOptions = async () => {
    try {
      const res = await api.get(`/inventory/storage-locations`);
      setStorageOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching storage options:", err);
    }
  };

  // Inline "add a unit" form inside the drawer. On success the new option is
  // stored in the database (so it survives reloads) and auto-selected.
  const addUnitOption = async () => {
    const name = newUnitName.trim();
    if (!name) {
      showToast("Enter a unit name first.");
      return;
    }
    if (unitOptions.some((u) => String(u.value).toLowerCase() === name.toLowerCase())) {
      showToast(`Unit "${name}" already exists.`);
      return;
    }
    setSavingOption(true);
    try {
      await api.post(`/inventory/units`, { name, group: newUnitGroup });
      await fetchUnitOptions();
      setNewItem((prev) => ({ ...prev, unit: name }));
      setNewUnitName("");
      setShowNewUnit(false);
      showToast(`Unit "${name}" added.`, "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add unit.");
    } finally {
      setSavingOption(false);
    }
  };

  const addStorageOption = async () => {
    const name = newStorageName.trim();
    if (!name) {
      showToast("Enter a storage location name first.");
      return;
    }
    if (storageOptions.some((s) => String(s.value).toLowerCase() === name.toLowerCase())) {
      showToast(`Storage location "${name}" already exists.`);
      return;
    }
    setSavingOption(true);
    try {
      await api.post(`/inventory/storage-locations`, { name });
      await fetchStorageOptions();
      setNewItem((prev) => ({ ...prev, storage_location: name }));
      setNewStorageName("");
      setShowNewStorage(false);
      showToast(`Storage location "${name}" added.`, "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add storage location.");
    } finally {
      setSavingOption(false);
    }
  };

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
    setNewItem({
      item_name: "",
      category: "Produce",
      quantity: "",
      unit: unitOptions[0]?.value || "kg",
      unit_price: "",
      reorder_level: "",
      expiry_date: "",
      storage_location: storageOptions[0]?.value || "Dry Pantry",
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
      storage_location: item.location || storageOptions[0]?.value || "Dry Pantry",
    });
  };

  // ==================== LINK DISHES MODAL ====================
  // Staged dish links: for a new item these are sent with the create call;
  // for an existing item they are saved one by one through the dish-link API.
  const openDishModal = async () => {
    setShowDishModal(true);
    setDishSearch("");
    setDishLinkId("");
    setDishLinkQty("");
    if (isEditMode && editItemId) {
      setDishModalLoading(true);
      try {
        const res = await api.get(`/inventory/${editItemId}/dish-links`);
        setDishModalLinks(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        showToast("Could not load the current dish links.");
        setDishModalLinks([]);
      } finally {
        setDishModalLoading(false);
      }
    } else {
      setDishModalLinks([...recipeLinks]);
    }
  };

  const addDishModalLink = async () => {
    const qty = parseFloat(dishLinkQty);
    if (!dishLinkId || isNaN(qty) || qty <= 0) {
      showToast("Pick a dish and enter how much is used per serving.");
      return;
    }
    if (dishModalLinks.some((l) => String(l.item_id) === String(dishLinkId))) {
      showToast("That dish is already linked. Remove it first to change the quantity.");
      return;
    }
    const chosen = menuItems.find((m) => String(m.item_id) === String(dishLinkId));
    const link = {
      item_id: parseInt(dishLinkId, 10),
      quantity_required: qty,
      name: chosen?.menu_name || "",
    };

    // For an existing item the link is saved to the database straight away,
    // so "Done" is purely a close action and nothing is lost if the admin
    // dismisses the modal without saving the item itself.
    if (isEditMode && editItemId) {
      try {
        await api.post(`/inventory/${editItemId}/dish-links`, {
          item_id: link.item_id,
          quantity_required: link.quantity_required,
        });
      } catch (err) {
        showToast(err.response?.data?.error || "Failed to link dish.");
        return;
      }
    }

    setDishModalLinks((prev) => [...prev, link]);
    setDishLinkId("");
    setDishLinkQty("");
  };

  const removeDishModalLink = async (itemId) => {
    if (isEditMode && editItemId) {
      try {
        await api.delete(`/inventory/${editItemId}/dish-links/${itemId}`);
        showToast("Dish unlinked.", "success");
      } catch (err) {
        showToast("Failed to unlink dish.");
        return;
      }
    }
    setDishModalLinks((prev) => prev.filter((l) => l.item_id !== itemId));
  };

  const saveDishModal = async () => {
    const pendingDishId = dishLinkId ? String(dishLinkId) : "";
    const pendingQty = Number(dishLinkQty);
    let nextDishLinks = [...dishModalLinks];

    if (pendingDishId && !nextDishLinks.some((l) => String(l.item_id) === pendingDishId)) {
      if (!Number.isFinite(pendingQty) || pendingQty <= 0) {
        showToast("Enter the quantity used per serving before finishing.");
        return;
      }

      const chosen = menuItems.find((m) => String(m.item_id) === pendingDishId);
      if (!chosen) {
        showToast("That dish is no longer available. Please choose another one.");
        return;
      }

      const pendingLink = {
        item_id: parseInt(pendingDishId, 10),
        quantity_required: pendingQty,
        name: chosen.menu_name || "",
      };

      if (isEditMode && editItemId) {
        try {
          await api.post(`/inventory/${editItemId}/dish-links`, {
            item_id: pendingLink.item_id,
            quantity_required: pendingLink.quantity_required,
          });
        } catch (err) {
          showToast(err.response?.data?.error || "Failed to link dish.");
          return;
        }
      }

      nextDishLinks = [...nextDishLinks, pendingLink];
      setDishModalLinks(nextDishLinks);
      setDishLinkId("");
      setDishLinkQty("");
    }

    if (isEditMode && editItemId) {
      // Links already persisted through the API as they were added/removed.
      setRecipeLinks([]);
    } else {
      setRecipeLinks(nextDishLinks);
    }
    setShowDishModal(false);
    fetchInventory();
    showToast(
      nextDishLinks.length > 0
        ? `Dish links saved (${nextDishLinks.length}).`
        : "No dishes linked.",
      "success",
    );
  };

  // Names of the dishes this material is used in. For a new item these come
  // from the staged recipeLinks; for an existing item they come from the
  // loaded inventory row. Shown as name badges in the drawer so the admin
  // sees WHICH dishes the material belongs to, not just how many.
  const usedDishNames = useMemo(() => {
    if (recipeLinks.length > 0) {
      return recipeLinks.map((l) => l.name).filter(Boolean);
    }
    if (isEditMode && editItemId) {
      const row = inventory.find((i) => String(i.id) === String(editItemId));
      return (row?.dishes || []).map((d) => d.name).filter(Boolean);
    }
    return [];
  }, [recipeLinks, isEditMode, editItemId, inventory]);

  const filteredDishChoices = useMemo(() => {
    const term = dishSearch.trim().toLowerCase();
    return menuItems
      .filter((m) => !dishModalLinks.some((l) => String(l.item_id) === String(m.item_id)))
      .filter((m) => !term || String(m.menu_name || "").toLowerCase().includes(term))
      .slice()
      .sort((a, b) =>
        String(a.menu_name || "").localeCompare(String(b.menu_name || ""), undefined, {
          sensitivity: "base",
        }),
      );
  }, [menuItems, dishModalLinks, dishSearch]);

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

  const staffHeader = isKitchenStaff ? <KitchenInventoryHeader onBack={onBack} /> : null;

  if (loading)
    return (
      <>
        {staffHeader}
        <div className="p-5 text-center">
          <RefreshCw className="animate-spin text-primary mx-auto" />
        </div>
      </>
    );

  return (
    <>
      {staffHeader}
      <div
        className="inventory-container container-fluid py-3 py-md-4 text-dark bg-light"
        style={{ minHeight: isKitchenStaff ? "calc(100dvh - 64px)" : "100vh" }}
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
                  <td colSpan={9} className="text-center py-5 inv-empty-cell">
                    <Package size={40} className="text-muted opacity-25 mb-2 mx-auto" />
                    <p className="fw-bold text-dark mb-1">
                      {inventory.length === 0
                        ? "No inventory yet"
                        : "No items match your filters"}
                    </p>
                    <p className="text-muted small mb-3 inv-empty-text">
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
                    <div className="d-inline-flex align-items-center gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary border-0 d-inline-flex align-items-center gap-1"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#addInvDrawer"
                        onClick={() => openEditMode(item)}
                        title={`Edit ${item.name}`}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger border-0 d-inline-flex align-items-center gap-1"
                        onClick={() => deleteItem(item.id)}
                        title={`Delete ${item.name}`}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={16} /> Delete
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
                  {storageOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                  {/* Keep any previously-saved value visible even if it is no
                      longer in the options list. */}
                  {newItem.storage_location &&
                    !storageOptions.some((s) => s.value === newItem.storage_location) && (
                      <option value={newItem.storage_location}>
                        {newItem.storage_location}
                      </option>
                    )}
                </select>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 mt-1 text-decoration-none small fw-semibold"
                  onClick={() => setShowNewStorage((v) => !v)}
                >
                  <Plus size={13} className="me-1" />
                  {showNewStorage ? "Cancel" : "Add storage location"}
                </button>
                {showNewStorage && (
                  <div className="d-flex gap-1 mt-1">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Walk-in Chiller"
                      value={newStorageName}
                      onChange={(e) => setNewStorageName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStorageOption())}
                      maxLength={100}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary fw-bold"
                      onClick={addStorageOption}
                      disabled={savingOption}
                    >
                      {savingOption ? "..." : "Add"}
                    </button>
                  </div>
                )}
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
                  {Array.from(new Set(unitOptions.map((u) => u.grp || "Other"))).map(
                    (group) => (
                      <optgroup key={group} label={group}>
                        {unitOptions
                          .filter((u) => (u.grp || "Other") === group)
                          .map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                      </optgroup>
                    ),
                  )}
                  {/* Keep a previously-saved unit visible even if it is no
                      longer in the options list. */}
                  {newItem.unit &&
                    !unitOptions.some((u) => u.value === newItem.unit) && (
                      <option value={newItem.unit}>{newItem.unit}</option>
                    )}
                </select>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 mt-1 text-decoration-none small fw-semibold"
                  onClick={() => setShowNewUnit((v) => !v)}
                >
                  <Plus size={13} className="me-1" />
                  {showNewUnit ? "Cancel" : "Add unit"}
                </button>
                {showNewUnit && (
                  <div className="d-grid gap-1 mt-1">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Sack"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUnitOption())}
                      maxLength={50}
                    />
                    <select
                      className="form-select form-select-sm"
                      value={newUnitGroup}
                      onChange={(e) => setNewUnitGroup(e.target.value)}
                      aria-label="Unit group"
                    >
                      <option value="Weight">Weight</option>
                      <option value="Volume">Volume</option>
                      <option value="Count">Count</option>
                      <option value="Other">Other</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary fw-bold"
                      onClick={addUnitOption}
                      disabled={savingOption}
                    >
                      {savingOption ? "..." : "Add"}
                    </button>
                  </div>
                )}
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
            {/* DISH LINKS — moved to a dedicated modal so the drawer stays
                compact. Links are staged (new item) or saved via the API
                (existing item) inside the modal. The drawer shows the actual
                dish names (not just a count) so the admin can see at a glance
                what the material is used in. */}
            <div className="border rounded-3 p-3 mt-3 bg-light">
              <label className="x-small fw-bold text-muted d-block mb-1">
                USED IN DISHES
              </label>
              {usedDishNames.length > 0 ? (
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {usedDishNames.map((name, idx) => (
                    <span
                      key={`${name}-${idx}`}
                      className="badge bg-white text-dark border fw-normal"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-2" style={{ fontSize: "0.72rem" }}>
                  Not linked to any dish yet.
                </p>
              )}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm w-100 fw-bold"
                onClick={openDishModal}
              >
                <Plus size={14} className="me-1" />
                Link Dishes
              </button>
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
      {/* ==================== LINK DISHES MODAL ====================
          Dedicated modal for dish linking so the inventory drawer stays
          compact. Scrollable list, search, mobile-friendly sizing. */}
      {showDishModal && (
        <div
          className="admin-confirm-backdrop"
          style={{ zIndex: 4000 }}
          onClick={() => setShowDishModal(false)}
        >
          <div
            className="admin-confirm-dialog dish-link-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-confirm-content">
              <div className="admin-confirm-header">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <Box size={20} className="text-primary flex-shrink-0" />
                  <h5 className="modal-title admin-confirm-title">
                    {isEditMode ? "Linked Dishes" : "Link Dishes (new item)"}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close flex-shrink-0 ms-auto"
                  onClick={() => setShowDishModal(false)}
                  aria-label="Close dish linking"
                ></button>
              </div>
              <div
                className="admin-confirm-body dish-link-body text-start"
                style={{ maxHeight: "55vh", overflowY: "auto" }}
              >
                {dishModalLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm mb-2"></div>
                    <p className="text-muted small mb-0">Loading dish links...</p>
                  </div>
                ) : (
                  <>
                    {/* Currently linked dishes */}
                    <label className="x-small fw-bold text-muted d-block mb-1">
                      LINKED DISHES
                    </label>
                    {dishModalLinks.length === 0 ? (
                      <p className="text-muted small mb-3">
                        No dishes linked yet. Add one below.
                      </p>
                    ) : (
                      <div className="mb-3">
                        {dishModalLinks.map((l) => (
                          <div
                            key={l.item_id}
                            className="d-flex justify-content-between align-items-center bg-light border rounded-2 px-2 py-1 mb-1"
                          >
                            <span className="small fw-semibold text-dark text-truncate">
                              {l.name}
                              <small className="text-muted ms-2 fw-normal">
                                {l.quantity_required} {newItem.unit || "unit"} / serving
                              </small>
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 border-0 flex-shrink-0 ms-2"
                              onClick={() => removeDishModalLink(l.item_id)}
                              title={`Unlink ${l.name}`}
                            >
                              <Trash2 size={13} /> Unlink
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add a new link */}
                    <label className="x-small fw-bold text-muted d-block mb-1">
                      ADD A DISH
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Search dishes..."
                      value={dishSearch}
                      onChange={(e) => setDishSearch(e.target.value)}
                    />
                    {filteredDishChoices.length === 0 ? (
                      <p className="text-muted small mb-2">
                        {dishSearch
                          ? "No dishes match your search."
                          : "All dishes are already linked."}
                      </p>
                    ) : (
                      <div
                        className="border rounded-2 mb-2 dish-link-list"
                        style={{ maxHeight: "180px", overflowY: "auto" }}
                      >
                        {filteredDishChoices.map((m) => (
                          <button
                            key={m.item_id}
                            type="button"
                            className="d-flex w-100 align-items-center justify-content-between border-0 bg-white text-start px-2 py-2 dish-link-choice"
                            onClick={() => setDishLinkId(String(m.item_id))}
                          >
                            <span className="small text-dark text-truncate">
                              {m.menu_name}
                            </span>
                            {String(dishLinkId) === String(m.item_id) && (
                              <span className="badge bg-primary flex-shrink-0 ms-2">
                                Selected
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="row g-2 align-items-end">
                      <div className="col-7">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm"
                          placeholder="Qty / serving"
                          value={dishLinkQty}
                          onChange={(e) => setDishLinkQty(e.target.value)}
                          disabled={!dishLinkId}
                        />
                      </div>
                      <div className="col-5 d-grid">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm fw-bold"
                          onClick={addDishModalLink}
                          disabled={!dishLinkId}
                        >
                          <Plus size={14} className="me-1" /> Add Link
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="admin-confirm-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary admin-confirm-btn"
                  onClick={() => setShowDishModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary admin-confirm-btn"
                  onClick={saveDishModal}
                  disabled={dishModalSaving}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}

export default Inventory;
