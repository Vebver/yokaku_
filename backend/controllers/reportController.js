const ReportModel = require('../models/BestSellerProduct');
const InventoryModel = require('../models/Inventory');
const FinancialReport = require('../models/FinancialReport');

const getFinancialAnalytics = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    const [topSellers, slowMoving, lowStockItems, inventoryUsage, financialStats, monthlyTrend, weeklyTrend, yearlyTrend] = await Promise.all([
      ReportModel.GetTopSellers(),
      ReportModel.GetSlowMoving(),
      InventoryModel.GetLowStockItems(),
      InventoryModel.GetInventoryUsage(),
      FinancialReport.getFinancialStats(todayStr),             
      FinancialReport.getMonthlyTrend(),
      FinancialReport.getWeeklyProfitTrend(todayStr),          
      FinancialReport.getYearlyProfitTrend(todayStr)           
    ]);

    // Structure response for all frontend components (Performance + Inventory)
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
          daily_revenue: financialStats?.today_revenue || 0,
          weekly_revenue: financialStats?.weekly_revenue || 0,   
          monthly_revenue: financialStats?.monthly_revenue || 0,
          yearly_revenue: financialStats?.yearly_revenue || 0,   
          aov: financialStats?.aov || 0,
          total_orders: financialStats?.total_orders || 0
        },
        
        // Map database fields to the exact keys expected by the React monthly table
        monthlyTrend: (monthlyTrend || []).map(item => ({
          month: item.label,
          revenue: Number(item.value || 0)
        })),
        
        weeklyTrend: weeklyTrend || [],
        
        // Map database fields to the exact keys expected by the React yearly table
        yearlyTrend: (yearlyTrend || []).map(item => ({
          year: item.label,
          revenue: Number(item.value || 0)
        }))
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