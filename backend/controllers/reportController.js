const ReportModel = require('../models/BestSellerProduct');
const InventoryModel = require('../models/Inventory');

const getFinancialAnalytics = async (req, res) => {
  try {
    // 1. Fetch ALL data sets simultaneously
    const [topSellers, slowMoving, lowStockItems, inventoryUsage] = await Promise.all([
      ReportModel.GetTopSellers(),
      ReportModel.GetSlowMoving(),
      InventoryModel.GetLowStockItems(),
      InventoryModel.GetInventoryUsage()
    ]);

    // 2. Calculate summary stats
    const totalRevenue = topSellers.reduce((acc, item) => acc + Number(item.total_revenue || 0), 0);
    const totalItemsSold = topSellers.reduce((acc, item) => acc + Number(item.total_sold || 0), 0);

    // 3. Structure response for all frontend components (Performance + Inventory)
    const responseData = {
      success: true,
      data: {
        // --- For ProductPerformance.jsx ---
        top_selling_products: topSellers,
        slow_moving_products: slowMoving,

        // --- For InventoryReport.jsx ---
        low_stock_count: lowStockItems.length,
        low_stock_list: lowStockItems.map(item => item.name).join(", "),
        inventory_usage: inventoryUsage,
        
        // --- For FinancialOverview.jsx ---
        summary: {
          total_revenue: totalRevenue,
          total_items_sold: totalItemsSold,
          active_inventory_items: inventoryUsage.length,
          monthly_growth: "+12.5%" 
        }
      }
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Error in Report Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while generating reports",
      error: error.message
    });
  }
};

module.exports = {
  getFinancialAnalytics
};