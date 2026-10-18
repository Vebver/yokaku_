import React, { useState, useEffect, useRef, useMemo } from "react";
import api, { SOCKET_URL, resolveAssetUrl } from "../../api";
import {
  Star,
  Trash2,
  Edit3,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "../ToastContext";
import { useSectionRefresh } from "../shared/sectionRefresh";
import { useConfirmation } from "../ConfirmationContext";

function Product() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editOriginalName, setEditOriginalName] = useState("");
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [imageError, setImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const submissionKey = useRef(null);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image: null,
    is_available: 1,
    is_featured: 0,
  });

  // Dynamic Unlimited package inclusions (only editable for package items).
  const [inclusions, setInclusions] = useState([]);

  // A package item is any menu item under an "Unlimited" category.
  const isPackageItem =
    String(
      menuItems.find(
        (i) =>
          (isEditing && i.item_id === editId) ||
          (!isEditing && i.category_id === Number(newItem.category_id)),
      )?.category_name || "",
    )
      .toLowerCase()
      .includes("unlimited") ||
    String(newItem.name || "")
      .toLowerCase()
      .includes("unlimited");

  const addInclusion = () =>
    setInclusions((prev) => [
      ...prev,
      { included_item_id: null, included_category_id: null, quantity_limit: 1, is_unlimited: false },
    ]);

  const updateInclusion = (index, field, value) =>
    setInclusions((prev) =>
      prev.map((inc, i) => {
        if (i !== index) return inc;
        const next = { ...inc, [field]: value };
        if (field === "included_item_id" && value) next.included_category_id = null;
        if (field === "included_category_id" && value) next.included_item_id = null;
        if (field === "is_unlimited") next.quantity_limit = value ? null : 1;
        return next;
      }),
    );

  const removeInclusion = (index) =>
    setInclusions((prev) => prev.filter((_, i) => i !== index));

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Reload on the shared admin refresh button in the top bar.
  useSectionRefresh(() => {
    fetchData();
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, menuRes] = await Promise.all([
        api.get(`/categories`),
        api.get(`/products`),
      ]);
      setCategories(catRes.data);
      setMenuItems(menuRes.data.sort((a, b) => b.item_id - a.item_id));
      if (catRes.data.length > 0 && !isEditing) {
        setNewItem((prev) => ({
          ...prev,
          category_id: catRes.data[0].category_id,
        }));
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading menu data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  // Filter controls.
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const resetPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setCategoryFilter("all");
    setAvailabilityFilter("all");
    resetPage();
  };

  const hasActiveFilters =
    categoryFilter !== "all" || availabilityFilter !== "all";

  // Category names, derived from the loaded items so the list needs no
  // separate request.
  const categoryNames = useMemo(
    () =>
      Array.from(
        new Set(
          menuItems
            .map((i) => i.category_name)
            .filter((c) => !!c && String(c).trim() !== ""),
        ),
      ).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
      ),
    [menuItems],
  );

  // Keep the newest menu items first after filtering.
  const filteredItems = menuItems
    .filter((item) => {
      if (
        !item.menu_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (
        categoryFilter !== "all" &&
        String(item.category_name || "") !== categoryFilter
      ) {
        return false;
      }
      if (availabilityFilter !== "all") {
        const isAvailable = Number(item.is_available) === 1;
        if (availabilityFilter === "available" && !isAvailable) return false;
        if (availabilityFilter === "unavailable" && isAvailable) return false;
      }
      return true;
    })
    .sort((a, b) => Number(b.item_id) - Number(a.item_id));

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

  const openEditDrawer = (item) => {
    const originalName = item.menu_name || "";
    setIsEditing(true);
    setEditId(item.item_id);
    setEditOriginalName(originalName);
    setInclusions(
      (item.package_inclusions || []).map((inc) => ({
        included_item_id: inc.included_item_id || null,
        included_category_id: inc.included_category_id || null,
        quantity_limit: inc.is_unlimited ? null : inc.quantity_limit ?? 1,
        is_unlimited: !!inc.is_unlimited,
      })),
    );
    setNewItem({
      name: originalName,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      image: null,
      is_available: item.is_available,
      is_featured: item.is_featured,
      local_path: item.local_path,
      image_url: item.image_url,
    });
  };

  const resetForm = () => {
    setIsEditing(false);
    setInclusions([]);
    setEditId(null);
    setEditOriginalName("");
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
    if (submissionLock.current) return;
    if (!isEditing && !newItem.image) {
      setImageError("Please select an image before adding this menu item.");
      return;
    }
    if (newItem.image && newItem.image.size > 10 * 1024 * 1024) {
      setImageError("File is too large. Please upload an image smaller than 10 MB.");
      return;
    }
    if (newItem.image && !/\.(jpe?g|png|webp)$/i.test(newItem.image.name)) {
      setImageError("Unsupported file type. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }
    setImageError("");
    const finalName =
      isEditing && !String(newItem.name || "").trim()
        ? editOriginalName
        : newItem.name;
    const signature = JSON.stringify([
      finalName || "",
      newItem.description || "",
      newItem.price || 0,
      newItem.category_id || "",
      newItem.is_available ?? 1,
      newItem.is_featured ?? 0,
      newItem.image
        ? [newItem.image.name, newItem.image.size, newItem.image.lastModified]
        : null,
    ]);
    if (!isEditing && submissionKey.current?.signature !== signature) {
      submissionKey.current = {
        signature,
        key: window.crypto.randomUUID(),
      };
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("menu_name", finalName || "");
      formData.append("description", newItem.description || "");
      formData.append("price", newItem.price || 0);
      formData.append("category_id", newItem.category_id || "");
      formData.append("is_available", newItem.is_available ?? 1);
      formData.append("is_featured", newItem.is_featured ?? 0);
      if (newItem.image) formData.append("image", newItem.image);
      if (isPackageItem) {
        formData.append("package_inclusions", JSON.stringify(inclusions));
      }

      if (isEditing) {
        await api.put(`/products/${editId}`, formData);
        showToast("Dish updated successfully!", "success");
      } else {
        await api.post(`/products`, formData, {
          headers: { "Idempotency-Key": submissionKey.current.key },
        });
        showToast("New dish added successfully!", "success");
        submissionKey.current = null;
      }

      fetchData();
      resetForm();
      if (closeBtnRef.current) closeBtnRef.current.click();
    } catch (err) {
      console.error("❌ Error saving item:", err);
      showToast(err.response?.data?.error || "Error saving item.");
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const deleteMenuItem = async (id) => {
    if (!(await confirm({
      title: "Remove menu item",
      message: "Remove this dish from the menu?",
      confirmLabel: "Remove dish",
    }))) return;
    try {
      await api.delete(`/products/${id}`);
      showToast("Dish deleted successfully!", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(
        "Error deleting item. Please check your connection or authorization.",
      );
    }
  };

  const toggleFeature = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await api.put(`/products/${id}/feature`, { is_featured: newStatus });

      // Success Alert
      showToast(
        newStatus === 1
          ? "Added to featured items!"
          : "Removed from featured items!",
      );
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(
        "Error updating featured status. Please check if you are logged in.",
      );
    }
  };

  const getImageUrl = (item, SOCKET_URL) => {
    if (item.image instanceof File) return URL.createObjectURL(item.image);
    const path = item.local_path || item.image_url;
    if (!path) return "https://placehold.co/150?text=No+Image";
    return path.startsWith("http")
      ? path
      : `${SOCKET_URL}/${path.replace(/^\//, "")}`;
  };

  // Resolve a raw DB path (e.g. "/uploads/x.png" or a full URL) to a usable URL.
  const resolvePath = (path) => resolveAssetUrl(path);

  // If the preferred image (local_path) fails to load, fall back to
  // image_url, then to a placeholder. Fixes blank images in admin.
  const handleImageError = (e, item) => {
    const used = e.currentTarget.getAttribute("data-src-type") || "local_path";
    if (used === "local_path") {
      const fallback = resolvePath(item.image_url);
      if (fallback) {
        e.currentTarget.setAttribute("data-src-type", "image_url");
        e.currentTarget.src = fallback;
        return;
      }
    }
    e.currentTarget.onerror = null;
    e.currentTarget.src = "https://placehold.co/150?text=No+Image";
  };

  if (loading) return <div className="p-5 text-center">Loading Menu...</div>;

  return (
    <div className="container-fluid p-3 p-md-4 bg-light">
      {/* HEADER */}
      <div className="admin-page-header px-2 mb-3">
        <h2 className="fw-bold mb-0">Menu Items</h2>
        <p className="text-muted mb-0 small">Digital menu items</p>
      </div>

      {/* SEARCH, FILTERS, AND ACTIONS */}
      <div className="admin-toolbar row g-2 align-items-center mb-4 px-2">
        <div className="col-12 col-xl-5">
          <div className="admin-search d-flex align-items-center bg-white rounded-3 border shadow-sm px-3">
            <Search size={20} className="text-muted flex-shrink-0" />
            <input
              type="text"
              className="form-control border-0 bg-transparent shadow-none w-100 ms-2"
              style={{
                color: "#212529",
                fontSize: "16px",
                fontWeight: "500",
                height: "100%",
              }}
              placeholder="Search dishes or categories..."
              aria-label="Search dishes or categories"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <select
              className="form-select form-select-sm flex-grow-1 flex-sm-grow-0"
              style={{ width: "auto", minWidth: "160px", height: "38px" }}
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
            >
              <option value="all">All categories</option>
              {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="form-select form-select-sm flex-grow-1 flex-sm-grow-0"
              style={{ width: "auto", minWidth: "160px", height: "38px" }}
              aria-label="Filter by availability"
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); resetPage(); }}
            >
              <option value="all">Any availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Not available</option>
            </select>
            {hasActiveFilters && <button className="btn btn-sm btn-outline-secondary fw-bold" onClick={clearFilters}><X size={14} /> Clear</button>}
            <button
              className="btn btn-primary admin-toolbar-button fw-bold shadow-sm d-inline-flex align-items-center justify-content-center ms-xl-auto"
              data-bs-toggle="offcanvas"
              data-bs-target="#addMenuDrawer"
              onClick={resetForm}
            >
              <Plus size={18} className="me-1" /> Add New Dish
            </button>
          </div>
        </div>
      </div>


{/* MOBILE CARDS */}
      <div className="d-lg-none">
        {currentItems.length === 0 ? (
          <div className="card shadow-sm border-0 text-center p-5 text-muted">
            No items found.
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {currentItems.map((item) => (
              <div
                key={`mobile-${item.item_id}`}
                className="card shadow-sm border-0"
                style={{ borderRadius: "12px" }}
              >
                <div className="card-body p-3">
                  <div className="d-flex align-items-start gap-3">
                    <img
                      src={getImageUrl(item, SOCKET_URL)}
                      alt={item.menu_name}
                      data-src-type="local_path"
                      onError={(e) => handleImageError(e, item)}
                      className="rounded shadow-sm border flex-shrink-0"
                      width="64"
                      height="64"
                      style={{ objectFit: "cover" }}
                    />
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="fw-bold text-dark text-truncate">
                          {item.menu_name}
                        </div>
                        <button
                          className="btn btn-link p-0 flex-shrink-0"
                          onClick={() =>
                            toggleFeature(item.item_id, item.is_featured)
                          }
                          aria-label="Toggle featured"
                        >
                          <Star
                            fill={item.is_featured ? "#ffcc00" : "none"}
                            color={item.is_featured ? "#ffcc00" : "#cbd5e1"}
                            size={20}
                          />
                        </button>
                      </div>
                      <div className="text-muted small mb-1">
                        {item.category_name}
                      </div>
                      {item.description && (
                        <p className="text-muted small mb-2 text-break">
                          {item.description}
                        </p>
                      )}
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span className="fw-bold text-success">
                          ₱{Number(item.price).toFixed(2)}
                        </span>
                        <span
                          className={`badge rounded-pill px-3 py-2 small ${item.is_available ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}
                        >
                          {item.is_available ? "Available" : "Not Available"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-sm btn-outline-primary flex-fill shadow-sm"
                      onClick={() => openEditDrawer(item)}
                      data-bs-toggle="offcanvas"
                      data-bs-target="#addMenuDrawer"
                    >
                      <Edit3 size={16} className="me-1" /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger flex-fill shadow-sm"
                      onClick={() => deleteMenuItem(item.item_id)}
                    >
                      <Trash2 size={16} className="me-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TABLE (desktop) */}
      <div
        className="card shadow-sm border-0 d-none d-lg-block"
        style={{ borderRadius: "12px" }}
      >
        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ minWidth: "600px" }}
          >
            <thead className="table-light">
              <tr>
                <th className="ps-4 py-3 small text-uppercase text-muted">
                  Dish
                </th>
                <th className="small text-uppercase text-muted">Category</th>
                <th className="small text-uppercase text-muted">Price</th>
                <th className="small text-uppercase text-muted text-center">
                  Featured
                </th>
                <th className="small text-uppercase text-muted">Status</th>
                <th className="text-end pe-4 small text-uppercase text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.item_id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center py-2">
                      <img
                        src={getImageUrl(item, SOCKET_URL)}
                        alt=""
                        data-src-type="local_path"
                        onError={(e) => handleImageError(e, item)}
                        className="rounded shadow-sm me-3 border"
                        width="48"
                        height="48"
                        style={{ objectFit: "cover" }}
                      />
                      <div>
                        <div className="fw-bold text-dark lh-1 mb-1">
                          {item.menu_name}
                        </div>
                        {item.description && (
                          <div className="text-muted small text-break">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border fw-normal">
                      {item.category_name}
                    </span>
                  </td>
                  <td className="fw-bold text-success">
                    ₱{Number(item.price).toFixed(2)}
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-link p-0"
                      onClick={() =>
                        toggleFeature(item.item_id, item.is_featured)
                      }
                    >
                      <Star
                        fill={item.is_featured ? "#ffcc00" : "none"}
                        color={item.is_featured ? "#ffcc00" : "#cbd5e1"}
                        size={20}
                      />
                    </button>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill px-3 py-2 small ${item.is_available ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}
                    >
                      {item.is_available ? "Available" : "Not Available"}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary shadow-sm d-inline-flex align-items-center gap-1"
                        onClick={() => openEditDrawer(item)}
                        data-bs-toggle="offcanvas"
                        data-bs-target="#addMenuDrawer"
                      >
                        <Edit3 size={16} /> Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger shadow-sm d-inline-flex align-items-center gap-1"
                        onClick={() => deleteMenuItem(item.item_id)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
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
          Showing <strong>{indexOfFirstItem + 1}</strong> to{" "}
          <strong>{Math.min(indexOfLastItem, filteredItems.length)}</strong> of{" "}
          <strong>{filteredItems.length}</strong> items
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link border-0 px-3 py-2"
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link border-0 text-dark fw-bold px-3 py-2 bg-white">
                Page {currentPage} of {totalPages || 1}
              </span>
            </li>
            <li
              className={`page-item ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}`}
            >
              <button
                className="page-link border-0 px-3 py-2"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* DRAWER */}
      <div
        className="offcanvas offcanvas-end shadow"
        tabIndex="-1"
        id="addMenuDrawer"
        style={{ width: "min(100%, 450px)" }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="fw-bold mb-0">
            {isEditing ? "Edit Menu Item" : "Add New Dish"}
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            ref={closeBtnRef}
          ></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAddOrUpdateMenuItem}>
            <div className="mb-3">
              <label className="form-label small fw-bold">Dish Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={newItem.name}
                onChange={handleInputChange}
                required={!isEditing}
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Description</label>
              <textarea
                name="description"
                className="form-control"
                rows={3}
                value={newItem.description || ""}
                onChange={handleInputChange}
                placeholder="Describe the dish, ingredients, or serving details"
              />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-bold">Category</label>
                <select
                  name="category_id"
                  className="form-select"
                  value={newItem.category_id}
                  onChange={handleInputChange}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-bold">Price (₱)</label>
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
              <label className="form-label small fw-bold">Status</label>
              <select
                name="is_available"
                className="form-select"
                value={newItem.is_available}
                onChange={handleInputChange}
              >
                <option value={1}>Available</option>
                <option value={0}>Not Available</option>
              </select>
            </div>
            {/* PACKAGE INCLUSIONS (Unlimited menus only) */}
            {isPackageItem && (
              <div className="mb-3 p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small fw-bold mb-0">
                    Package Inclusions
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={addInclusion}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
                <p className="text-muted mb-2" style={{ fontSize: "0.75rem" }}>
                  Pick a category or a specific dish, then set a quantity limit or mark it Unlimited.
                </p>
                {inclusions.length === 0 && (
                  <p className="text-muted small mb-0">No inclusions configured yet.</p>
                )}
                {inclusions.map((inc, index) => (
                  <div
                    key={index}
                    className="row g-2 align-items-end mb-2 p-2 border rounded bg-white"
                  >
                    <div className="col-12 col-sm-5">
                      <label className="form-label small text-muted mb-1">Include</label>
                      <select
                        className="form-select form-select-sm"
                        value={
                          inc.included_item_id
                            ? `item:${inc.included_item_id}`
                            : inc.included_category_id
                              ? `cat:${inc.included_category_id}`
                              : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.startsWith("item:")) {
                            updateInclusion(index, "included_item_id", parseInt(v.slice(5)));
                            updateInclusion(index, "included_category_id", null);
                          } else if (v.startsWith("cat:")) {
                            updateInclusion(index, "included_category_id", parseInt(v.slice(4)));
                            updateInclusion(index, "included_item_id", null);
                          }
                        }}
                      >
                        <option value="">— Select —</option>
                        <optgroup label="Whole category">
                          {categories.map((cat) => (
                            <option key={cat.category_id} value={`cat:${cat.category_id}`}>
                              {cat.category_name} (all items)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Specific dish">
                          {menuItems.map((mi) => (
                            <option key={mi.item_id} value={`item:${mi.item_id}`}>
                              {mi.menu_name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="col-6 col-sm-4">
                      <label className="form-label small text-muted mb-1">Limit</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={inc.is_unlimited ? "" : inc.quantity_limit ?? 1}
                        placeholder="∞ Unlimited"
                        disabled={inc.is_unlimited}
                        onChange={(e) =>
                          updateInclusion(index, "quantity_limit", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="col-6 col-sm-2">
                      <div className="form-check mb-1">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`inc-unlim-${index}`}
                          checked={inc.is_unlimited}
                          onChange={(e) =>
                            updateInclusion(index, "is_unlimited", e.target.checked)
                          }
                        />
                        <label className="form-check-label small" htmlFor={`inc-unlim-${index}`}>
                          Unlimited
                        </label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-1 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeInclusion(index)}
                        title="Remove inclusion"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 text-center">
              <div className="bg-light p-3 rounded border mb-2">
                {newItem.image instanceof File ? (
                  <img
                    src={URL.createObjectURL(newItem.image)}
                    alt="Preview"
                    className="img-thumbnail"
                    style={{
                      height: "140px",
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : newItem.local_path || newItem.image_url ? (
                  <img
                    src={getImageUrl(newItem, SOCKET_URL)}
                    alt="Preview"
                    data-src-type="local_path"
                    onError={(e) => handleImageError(e, newItem)}
                    className="img-thumbnail"
                    style={{
                      height: "140px",
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center text-muted"
                    style={{ height: "140px" }}
                  >
                    No image selected
                  </div>
                )}
              </div>
              <input
                type="file"
                className="form-control"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setImageError("");
                      if (!file) return;
                      if (!/\.(jpe?g|png|webp)$/i.test(file.name) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                        setImageError("Unsupported file type. Please upload JPG, JPEG, PNG, or WEBP.");
                        e.target.value = "";
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        setImageError("File is too large. Please upload an image smaller than 10 MB.");
                        e.target.value = "";
                        return;
                      }
                      setNewItem({ ...newItem, image: file });
                    }}
                  />
                  <div className="form-text text-start">Upload a compressed image (JPG, JPEG, PNG, or WEBP). Maximum file size: 10 MB.</div>
                  {imageError && <div className="text-danger small text-start mt-1" role="alert">{imageError}</div>}
                </div>
            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />{isEditing ? "Updating..." : "Adding..."}</>
              ) : isEditing ? "Update Dish" : "Add Menu"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Product;
