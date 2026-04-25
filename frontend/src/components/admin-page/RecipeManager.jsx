import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, Info } from "lucide-react";

function RecipeManager() {
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [currentRecipe, setCurrentRecipe] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [ingredientId, setIngredientId] = useState("");
  const [qtyNeeded, setQtyNeeded] = useState("");

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedItemId) fetchCurrentRecipe();
    else setCurrentRecipe([]);
  }, [selectedItemId]);

  const fetchBaseData = async () => {
    try {
      const [menuRes, invRes] = await Promise.all([
        axios.get("http://localhost:5000/api/products"),
        axios.get("http://localhost:5000/api/inventory")
      ]);
      setMenuItems(menuRes.data);
      setInventoryItems(invRes.data);
    } catch (err) {
      console.error("Error fetching base data:", err);
    }
  };

  const fetchCurrentRecipe = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/products/${selectedItemId}/ingredients`);
      setCurrentRecipe(res.data);
    } catch (err) {
      console.error("Error fetching recipe:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !ingredientId || !qtyNeeded) return alert("Fill all fields");

    try {
      await axios.post(`http://localhost:5000/api/products/${selectedItemId}/ingredients`, {
        inventory_id: ingredientId,
        quantity_required: qtyNeeded
      });
      setQtyNeeded("");
      fetchCurrentRecipe();
    } catch (err) {
      alert("Error adding ingredient");
    }
  };

  const removeIngredient = async (recipeId) => {
    if (!window.confirm("Remove this ingredient?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/ingredients/${recipeId}`);
      fetchCurrentRecipe();
    } catch (err) {
      alert("Error removing");
    }
  };

  return (
    <div className="container-fluid p-4">
      <h2 className="fw-bold mb-4">Recipe Manager</h2>
      
      <div className="row g-4">
        {/* Left Side: Select Product */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4">
            <label className="form-label fw-bold">1. Select Menu Item</label>
            <select 
              className="form-select mb-3" 
              value={selectedItemId} 
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="">-- Choose a Dish --</option>
              {menuItems.map(item => (
                <option key={item.item_id} value={item.item_id}>{item.name}</option>
              ))}
            </select>
            <div className="alert alert-info py-2 small d-flex align-items-center">
              <Info size={16} className="me-2"/>
              Link inventory items to this dish.
            </div>
          </div>
        </div>

        {/* Right Side: Manage Ingredients */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-3">Ingredients List</h5>
            
            {selectedItemId ? (
              <>
                <form className="row g-2 mb-4" onSubmit={handleAddIngredient}>
                  <div className="col-md-6">
                    <select className="form-select" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} required>
                      <option value="">Select Inventory Item...</option>
                      {inventoryItems.map(inv => (
                        <option key={inv.inventory_id} value={inv.inventory_id}>
                          {inv.item_name} (Stock: {inv.quantity} {inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <input type="number" step="0.01" className="form-control" placeholder="Qty Used" value={qtyNeeded} onChange={(e) => setQtyNeeded(e.target.value)} required />
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-success w-100 d-flex align-items-center justify-content-center">
                      <Plus size={18} className="me-1"/> Add
                    </button>
                  </div>
                </form>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Raw Material</th>
                        <th>Required Amount</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecipe.length > 0 ? currentRecipe.map(ing => (
                        <tr key={ing.recipe_id}>
                          <td>{ing.item_name}</td>
                          <td>{ing.quantity_required} {ing.unit}</td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeIngredient(ing.recipe_id)}>
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="3" className="text-center text-muted p-4">No ingredients linked yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center p-5 text-muted">
                Select a menu item from the left to manage its recipe.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeManager;