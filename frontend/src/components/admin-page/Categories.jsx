import React, { useState } from 'react';

function Categories() {
  // 1. State for Categories (Initial Data)
  const [categoryList, setCategoryList] = useState([
    { id: 1, name: 'Pizza', itemCount: 12 },
    { id: 2, name: 'Noodles', itemCount: 8 },
    { id: 3, name: 'Appetizers', itemCount: 15 },
    { id: 4, name: 'Desserts', itemCount: 5 },
    { id: 5, name: 'Drinks', itemCount: 20 },
  ]);

  const [newCategoryName, setNewCategoryName] = useState('');

  // 2. Add Category Logic
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newEntry = {
      id: categoryList.length + 1,
      name: newCategoryName,
      itemCount: 0 // New categories start with 0 items
    };

    setCategoryList([...categoryList, newEntry]);
    setNewCategoryName('');

    // Close Modal
    const modalElement = document.getElementById('addCategoryModal');
    const modal = window.bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
  };

  // 3. Delete Category Logic
  const deleteCategory = (id) => {
    if (window.confirm("Are you sure? This will remove the category classification.")) {
      setCategoryList(categoryList.filter(cat => cat.id !== id));
    }
  };

  return (
    <div className="container-fluid fade-in">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Category Management</h2>
          <p className="text-muted">Organize your menu items into groups</p>
        </div>
        <button 
          className="btn btn-primary px-4 shadow-sm" 
          data-bs-toggle="modal" 
          data-bs-target="#addCategoryModal"
        >
          <i className="bi bi-plus-lg me-2"></i>New Category
        </button>
      </div>

      {/* Categories Table */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted">
                  <tr>
                    <th className="ps-4" style={{ width: '80px' }}>ID</th>
                    <th>Category Name</th>
                    <th>Linked Products</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryList.map((cat) => (
                    <tr key={cat.id}>
                      <td className="ps-4 text-muted">#{cat.id}</td>
                      <td>
                        <div className="fw-bold d-flex align-items-center">
                          <i className="bi bi-folder2-open me-2 text-primary"></i>
                          {cat.name}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info px-3">
                          {cat.itemCount} Items
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button className="btn btn-sm btn-light border me-2" title="Edit">
                          <i className="bi bi-pencil-square"></i> Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-light border text-danger" 
                          onClick={() => deleteCategory(cat.id)}
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Help/Summary (Optional) */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm p-4 bg-primary text-white">
            <h5 className="fw-bold mb-3">Quick Tip</h5>
            <p className="small mb-0 opacity-75">
              Organizing products into categories helps customers find what they want faster on the main menu. 
              <br/><br/>
              Ensure names are short and descriptive (e.g., "Refreshing Drinks" instead of just "Drinks").
            </p>
          </div>
        </div>
      </div>

      {/* --- ADD CATEGORY MODAL --- */}
      <div className="modal fade" id="addCategoryModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered shadow-lg">
          <div className="modal-content border-0">
            <div className="modal-header border-0 pt-4 px-4">
              <h5 className="modal-title fw-bold">Create New Category</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">Category Name</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg border-2" 
                    placeholder="e.g. Seafood, Grill, Specials..." 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="form-text mt-2 text-muted small">
                    <i className="bi bi-info-circle me-1"></i>
                    This name will appear on the customer menu filter.
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pb-4 px-4">
                <button type="button" className="btn btn-light px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary px-4">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Categories;