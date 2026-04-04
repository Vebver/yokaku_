import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });

  const closeBtnRef = useRef(null);

  // --- FETCH CATEGORIES FROM DATABASE ---
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories");
      // Map database columns (category_id, name, description)
      const mappedData = response.data.map((cat) => ({
        id: cat.category_id,
        name: cat.name,
        description: cat.description,
      }));
      setCategories(mappedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory({ ...newCategory, [name]: value });
  };

  // --- ADD TO DATABASE ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/categories", {
        name: newCategory.name,
        description: newCategory.description,
      });

      fetchCategories(); // Refresh list

      setNewCategory({
        name: "",
        description: "",
      });
      
      if (closeBtnRef.current) closeBtnRef.current.click();
      alert("Category created successfully!");
    } catch (err) {
      alert("Failed to add category.");
    }
  };

  // --- DELETE FROM DATABASE ---
  const deleteCategory = async (id) => {
    if (window.confirm("Delete this category? This might affect products linked to it.")) {
      try {
        await axios.delete(`http://localhost:5000/api/categories/${id}`);
        setCategories(categories.filter((c) => c.id !== id));
      } catch (err) {
        alert("Error deleting category. Check if products are still using it.");
      }
    }
  };

  if (loading)
    return <div className="p-5 text-center">Loading Categories...</div>;

  return (
    <div className="container-fluid">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Category Management</h2>
            <p className="text-muted">Organize your restaurant menu</p>
          </div>
          <button
            className="btn btn-dark px-4 shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#addCategoryModal"
          >
            <i className="bi bi-folder-plus me-2"></i>Add New Category
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="ps-4 text-muted">#{cat.id}</td>
                    <td>
                      <div className="fw-bold text-primary">{cat.name}</div>
                    </td>
                    <td>
                      <span className="text-muted small">
                        {cat.description || "No description provided"}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteCategory(cat.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && (
              <div className="text-center p-5 text-muted">
                No categories found. Start by adding one!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ADD CATEGORY MODAL --- */}
      <div
        className="modal fade"
        id="addCategoryModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pt-4 px-4">
              <h5 className="modal-title fw-bold">Create Category</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                ref={closeBtnRef}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Category Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Main Course, Seafood, Drinks"
                    className="form-control"
                    value={newCategory.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="3"
                    value={newCategory.description}
                    onChange={handleInputChange}
                  ></textarea>
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
                <button type="submit" className="btn btn-dark px-4">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Categories;