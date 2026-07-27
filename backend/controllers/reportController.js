const ReportModel = require("../models/BestSellerProduct");
const InventoryModel = require("../models/Inventory");
const FinancialReport = require("../models/FinancialReport");

const getFinancialAnalytics = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });

const [
      topSellers,
      slowMoving,
      lowStockItems,
      inventoryUsage,
      financialStats,
      monthlyTrend,
      weeklyTrend,
      yearlyTrend,
      performanceSummary,
      inventorySummary,
      expiredItems,
    ] = await Promise.all([
      ReportModel.GetTopSellers(),
      ReportModel.GetSlowMoving(),
      InventoryModel.GetLowStockItems(),
      InventoryModel.GetInventoryUsage(),
      FinancialReport.getFinancialStats(todayStr),
      FinancialReport.getMonthlyTrend(),
      FinancialReport.getWeeklyProfitTrend(todayStr),
      FinancialReport.getYearlyProfitTrend(todayStr),
      ReportModel.GetPerformanceSummary(),
      InventoryModel.GetInventorySummary(),
      InventoryModel.GetExpiredItems(),
    ]);

    const calculatedItemsUsed = Number(inventorySummary?.items_used || 0);
    const calculatedLowStockCount = lowStockItems.length;

    // Structure response for all frontend variations
    const responseData = {
      success: true,
      data: {
        // --- For ProductPerformance.jsx ---
        top_selling_products: topSellers,
        slow_moving_products: slowMoving,

        // --- For InventoryReport.jsx (Main Stats - All Variations Covered) ---
        total_inventory_value: Number(
          inventorySummary?.total_inventory_value || 0,
        ),
        totalInventoryValue: Number(
          inventorySummary?.total_inventory_value || 0,
        ),

        // 1. ITEMS USED - All Naming Variations
        items_used: calculatedItemsUsed,
        itemsUsed: calculatedItemsUsed,
        totalItemsUsed: calculatedItemsUsed,
        total_items_used: calculatedItemsUsed,
        usedItems: calculatedItemsUsed,
        used_items: calculatedItemsUsed,

        // 2. CONSUMPTION RATE - All Naming Variations
        consumption_rate: Number(inventorySummary?.consumption_rate || 0),
        consumptionRate: Number(inventorySummary?.consumption_rate || 0),

        // 3. NEED TO REORDER - All Naming Variations
        low_stock_count: calculatedLowStockCount,
        lowStockCount: calculatedLowStockCount,
        reorder_count: calculatedLowStockCount,
        reorderCount: calculatedLowStockCount,
        need_to_reorder: calculatedLowStockCount,
        needToReorder: calculatedLowStockCount,

        low_stock_list: lowStockItems,
        expired_items: expiredItems,
        expiredItems: expiredItems,
        inventory_usage: inventoryUsage,
        // --- For FinancialOverview.jsx & Nested summaries ---
        summary: {
          total_revenue: Number(performanceSummary?.total_revenue || 0),
          total_items_sold: Number(performanceSummary?.total_items_sold || 0),
          daily_revenue: financialStats?.today_revenue || 0,
          weekly_revenue: financialStats?.weekly_revenue || 0,
          monthly_revenue: financialStats?.monthly_revenue || 0,
          yearly_revenue: financialStats?.yearly_revenue || 0,
          aov: financialStats?.aov || 0,
          total_orders: financialStats?.total_orders || 0,

          total_inventory_value: Number(inventorySummary?.total_inventory_value || 0),
          totalInventoryValue: Number(inventorySummary?.total_inventory_value || 0),

          items_used: calculatedItemsUsed,
          itemsUsed: calculatedItemsUsed,
          totalItemsUsed: calculatedItemsUsed,
          total_items_used: calculatedItemsUsed,
          usedItems: calculatedItemsUsed,
          used_items: calculatedItemsUsed,

          consumption_rate: Number(inventorySummary?.consumption_rate || 0),
          consumptionRate: Number(inventorySummary?.consumption_rate || 0),

          // --- FIXED KEYS FOR THE REORDER CARD ---
          reorder_items: calculatedLowStockCount, // Maps to summary?.reorder_items
          reorderItems: calculatedLowStockCount,   // Maps to summary?.reorderItems
          
          low_stock_count: calculatedLowStockCount,
          lowStockCount: calculatedLowStockCount,
          reorder_count: calculatedLowStockCount,
          reorderCount: calculatedLowStockCount,
          need_to_reorder: calculatedLowStockCount,
          needToReorder: calculatedLowStockCount,
          
          low_stock_list: lowStockItems,
          lowStockList: lowStockItems,
        },

        // Map database fields to the exact keys expected by the React monthly table
        monthlyTrend: (monthlyTrend || []).map((item) => ({
          month: item.label,
          revenue: Number(item.value || 0),
        })),

        weeklyTrend: weeklyTrend || [],

        // Map database fields to the exact keys expected by the React yearly table
        yearlyTrend: (yearlyTrend || []).map((item) => ({
          year: item.label,
          revenue: Number(item.value || 0),
        })),
      },
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in Report Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while generating reports",
      error: error.message,
    });
  }
};

module.exports = {
  getFinancialAnalytics,
};
