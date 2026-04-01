import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Product() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    item_name: "", // Changed from 'name'
    category: "Appetizers", // You can change the default starting value here
    price: "",
    quantity: "", // Changed from 'stock
  });

  const closeBtnRef = useRef(null);

  // --- FETCH DATA FROM DATABASE ---
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      // Map database columns to React state names if they differ
      const mappedData = response.data.map((item) => ({
        id: item.inventory_id,
        name: item.item_name,
        category: item.category,
        price: item.price,
        stock: item.quantity,
      }));
      setProducts(mappedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  // --- ADD TO DATABASE ---
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/products", {
        item_name: newProduct.item_name,
        category: newProduct.category,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
      });

      // Refresh list from DB
      fetchInventory();

      setNewProduct({
        item_name: "",
        category: "Appetizers",
        price: "",
        quantity: "",
      });
      if (closeBtnRef.current) closeBtnRef.current.click();
      alert("Item added to inventory!");
    } catch (err) {
      alert("Failed to add item.");
    }
  };

  // --- DELETE FROM DATABASE ---
  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product permanently?")) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        setProducts(products.filter((p) => p.id !== id));
      } catch (err) {
        alert("Error deleting item.");
      }
    }
  };

  if (loading)
    return <div className="p-5 text-center">Loading Inventory...</div>;

  return (
    <div className="container-fluid">
      <div className="fade-in">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0">Menu Management</h2>
            <p className="text-muted">Real-time database inventory</p>
          </div>
          <button
            className="btn btn-primary px-4 shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#addProductModal"
          >
            <i className="bi bi-plus-lg me-2"></i>Add New Item
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="ps-4 text-muted">#{product.id}</td>
                    <td>
                      <div className="fw-bold">{product.name}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {product.category}
                      </span>
                    </td>
                    <td className="fw-bold text-success">
                      ${Number(product.price).toFixed(2)}
                    </td>
                    <td>
                      {product.stock > 10 ? (
                        <span className="text-success">
                          <i className="bi bi-check-circle-fill me-1"></i>{" "}
                          {product.stock} in stock
                        </span>
                      ) : (
                        <span className="text-danger fw-bold">
                          <i className="bi bi-exclamation-triangle-fill me-1"></i>{" "}
                          Only {product.stock} left
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteProduct(product.id)}
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

      {/* --- ADD PRODUCT MODAL --- */}
      <div
        className="modal fade"
        id="addProductModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pt-4 px-4">
              <h5 className="modal-title fw-bold">Add New Edible Product</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                ref={closeBtnRef}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="item_name" // Corrected
                    className="form-control"
                    value={newProduct.item_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">Category</label>
                    <select
                      name="category"
                      className="form-select"
                      value={newProduct.category}
                      onChange={handleInputChange}
                    >
                      <option value="Pizza">Pizza</option>
                      <option value="Noodles">Noodles</option>
                      <option value="Appetizers">Appetizers</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      name="price" // Corrected (matches state)
                      step="0.01"
                      className="form-control"
                      value={newProduct.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Initial Stock Level
                  </label>
                  <input
                    type="number"
                    name="quantity" // Corrected
                    className="form-control"
                    value={newProduct.quantity}
                    onChange={handleInputChange}
                    required
                  />
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
