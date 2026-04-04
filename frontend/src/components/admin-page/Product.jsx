import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Product() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]); // To populate the dropdown
  const [loading, setLoading] = useState(true);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "", // Now using ID linked to Categories table
    image_url: "",
    is_available: 1, // 1 for true, 0 for false
  });

  const closeBtnRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch both menu items and categories
      const catRes = await axios.get("http://localhost:5000/api/categories");
      setCategories(catRes.data);

      const menuRes = await axios.get("http://localhost:5000/api/products");
      setMenuItems(menuRes.data);
      // Set default category if categories exist
      if (catRes.data.length > 0) {
        setNewItem((prev) => ({
          ...prev,
          category_id: catRes.data[0].category_id,
        }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/products", newItem);
      fetchData(); // Refresh list

      // Reset Form
      setNewItem({
        name: "",
        description: "",
        price: "",
        category_id: categories[0]?.category_id || "",
        image_url: "",
        is_available: 1,
      });

      if (closeBtnRef.current) closeBtnRef.current.click();
      alert("Menu item added successfully!");
    } catch (err) {
      alert("Failed to add menu item.");
    }
  };

  const deleteMenuItem = async (id) => {
    if (window.confirm("Remove this item from the menu?")) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        setMenuItems(menuItems.filter((item) => item.item_id !== id));
      } catch (err) {
        alert("Error deleting item.");
      }
    }
  };

  if (loading) return <div className="p-5 text-center">Loading Menu...</div>;

  return (
    <div className="container-fluid">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Menu Management</h2>
            <p className="text-muted">
              Manage what customers see on the digital menu
            </p>
          </div>
          <button
            className="btn btn-primary px-4 shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#addMenuModal"
          >
            <i className="bi bi-plus-lg me-2"></i>Add New Dish
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted">
                <tr>
                  <th className="ps-4">Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.item_id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt=""
                            className="rounded me-3"
                            style={{
                              width: "40px",
                              height: "40px",
                              objectFit: "cover",
                            }}
                          />
                        )}
                        <div>
                          <div className="fw-bold">{item.name}</div>
                          <small className="text-muted">
                            {item.description?.substring(0, 30)}...
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="fw-bold text-success">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td>
                      {item.is_available ? (
                        <span className="badge bg-success-subtle text-success px-3">
                          Available
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger px-3">
                          Sold Out
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteMenuItem(item.item_id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- ADD MENU ITEM MODAL --- */}
      <div
        className="modal fade"
        id="addMenuModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pt-4 px-4">
              <h5 className="modal-title fw-bold">Add Menu Item</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                ref={closeBtnRef}
              ></button>
            </div>
            <form onSubmit={handleAddMenuItem}>
              <div className="modal-body px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Dish Name</label>
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
                  <label className="form-label small fw-bold">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="2"
                    value={newItem.description}
                    onChange={handleInputChange}
                  ></textarea>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">Category</label>
                    <select
                      name="category_id"
                      className="form-select"
                      value={newItem.category_id}
                      onChange={handleInputChange}
                      required
                    >
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <option value="">-- No Categories Found --</option>
                      )}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">
                      Price ($)
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
                  <label className="form-label small fw-bold">Image URL</label>
                  <input
                    type="text"
                    name="image_url"
                    className="form-control"
                    placeholder="https://..."
                    value={newItem.image_url}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Availability
                  </label>
                  <select
                    name="is_available"
                    className="form-select"
                    value={newItem.is_available}
                    onChange={handleInputChange}
                  >
                    <option value={1}>Available</option>
                    <option value={0}>Out of Stock / Hide</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-top-0 pb-4 px-4">
                <button
                  type="button"
                  className="btn btn-light"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-4">
                  Add to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Product;
