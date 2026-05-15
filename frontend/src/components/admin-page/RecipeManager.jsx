import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, Info, BookOpen, Loader2, Package } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function RecipeManager() {
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [currentRecipe, setCurrentRecipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  // Form State
  const [ingredientId, setIngredientId] = useState("");
  const [qtyNeeded, setQtyNeeded] = useState("");

  // Helper to get the auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedItemId) fetchCurrentRecipe();
    else setCurrentRecipe([]);
  }, [selectedItemId]);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      // Added getAuthHeader() to both requests
      const [menuRes, invRes] = await Promise.all([
        axios.get(`${API_BASE}/products`, getAuthHeader()),
        axios.get(`${API_BASE}/inventory`, getAuthHeader()),
      ]);
      setMenuItems(menuRes.data);
      setInventoryItems(invRes.data);
    } catch (err) {
      console.error("Error fetching base data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRecipe = async () => {
    try {
      setLoadingRecipe(true);
      const res = await axios.get(
        `${API_BASE}/products/${selectedItemId}/ingredients`,
        getAuthHeader() // Added header
      );
      setCurrentRecipe(res.data);
    } catch (err) {
      console.error("Error fetching recipe:", err);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !ingredientId || !qtyNeeded)
      return alert("Fill all fields");

    try {
      await axios.post(
        `${API_BASE}/products/${selectedItemId}/ingredients`,
        { inventory_id: ingredientId, quantity_required: qtyNeeded },
        getAuthHeader() // Added header
      );
      setQtyNeeded("");
      setIngredientId("");
      fetchCurrentRecipe();
    } catch (err) {
      alert("Error adding ingredient");
    }
  };

  const removeIngredient = async (recipeId) => {
    if (!window.confirm("Remove this ingredient?")) return;
    try {
      await axios.delete(
        `${API_BASE}/products/ingredients/${recipeId}`,
        getAuthHeader() // Added header
      );
      fetchCurrentRecipe();
    } catch (err) {
      alert("Error removing ingredient");
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Loader2 className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="container-fluid py-3 py-md-4 text-dark bg-light" style={{ minHeight: '100vh' }}>
      
      {/* RESPONSIVE HEADER */}
      <div className="row align-items-center mb-4 px-2">
        <div className="col-12 col-md-8">
          <h2 className="fw-bold mb-1">Recipe Manager</h2>
          <p className="text-muted small mb-0">Link raw inventory materials to menu items</p>
        </div>
        <div className="col-12 col-md-4 text-md-end mt-2 mt-md-0">
          <span className="badge bg-dark px-3 py-2">{menuItems.length} Total Dishes</span>
        </div>
      </div>

      <div className="row g-3 px-2">
        {/* 1. SELECT PRODUCT CARD */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
            <div className="bg-primary p-3 text-white d-flex align-items-center gap-2">
              <BookOpen size={20} />
              <span className="fw-bold small text-uppercase">1. Choose a Dish</span>
            </div>
            <div className="card-body p-4 bg-white">
              <label className="form-label small fw-bold text-muted">MENU ITEM</label>
              <select
                className="form-select border shadow-sm mb-3 py-2 fw-semibold"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Select Product --</option>
                {menuItems.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.name}
                  </option>
                ))}
              </select>
              
              <div className="p-3 bg-light rounded-3 border d-flex gap-2 align-items-start">
                <Info size={16} className="text-primary mt-1 flex-shrink-0" />
                <p className="small text-muted mb-0">
                  Select a product to view its current recipe and add or remove ingredients.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MANAGE INGREDIENTS CARD */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden bg-white">
            <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-uppercase small text-muted">
                <Package size={16} className="me-2 text-primary" />
                Ingredients List
              </h6>
              {selectedItemId && <span className="badge bg-success-subtle text-success px-2 py-1">Item ID: #{selectedItemId}</span>}
            </div>

            <div className="card-body p-3 p-md-4">
              {selectedItemId ? (
                <>
                  {/* ADD INGREDIENT FORM */}
                  <form className="row g-2 mb-4 p-3 bg-light rounded-3 border" onSubmit={handleAddIngredient}>
                    <div className="col-12 col-md-6">
                      <label className="x-small fw-bold text-muted mb-1 d-block">SELECT MATERIAL</label>
                      <select
                        className="form-select form-select-sm shadow-sm"
                        value={ingredientId}
                        onChange={(e) => setIngredientId(e.target.value)}
                        required
                      >
                        <option value="">Choose Inventory...</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.inventory_id} value={inv.inventory_id}>
                            {inv.item_name} ({inv.quantity} {inv.unit} left)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="x-small fw-bold text-muted mb-1 d-block">QTY NEEDED</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-select-sm shadow-sm"
                        placeholder="0.00"
                        value={qtyNeeded}
                        onChange={(e) => setQtyNeeded(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6 col-md-3 d-flex align-items-end">
                      <button className="btn btn-primary btn-sm w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center py-2">
                        <Plus size={16} className="me-1" /> Add Link
                      </button>
                    </div>
                  </form>

                  {/* INGREDIENTS TABLE */}
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr className="x-small text-muted text-uppercase">
                          <th className="ps-3 py-2">Raw Material</th>
                          <th>Amount Required</th>
                          <th className="text-end pe-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingRecipe ? (
                          <tr><td colSpan="3" className="text-center py-5"><Loader2 className="animate-spin text-primary mx-auto" /></td></tr>
                        ) : currentRecipe.length > 0 ? (
                          currentRecipe.map((ing) => (
                            <tr key={ing.recipe_id}>
                              <td className="ps-3 fw-bold small text-dark">{ing.item_name}</td>
                              <td><span className="badge bg-light text-dark border fw-normal">{ing.quantity_required} {ing.unit}</span></td>
                              <td className="text-end pe-3">
                                <button className="btn btn-sm btn-outline-danger border-0 p-2 shadow-none" onClick={() => removeIngredient(ing.recipe_id)}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="3" className="text-center py-5 text-muted small">No ingredients linked yet. Add one above!</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 my-5">
                  <BookOpen size={48} className="text-muted opacity-25 mb-3" />
                  <p className="text-muted small fw-bold">Select a menu item from the left panel to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .x-small { font-size: 0.65rem; letter-spacing: 0.5px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default RecipeManager;