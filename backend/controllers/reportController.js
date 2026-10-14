const ReportModel = require("../models/BestSellerProduct");
const InventoryModel = require("../models/Inventory");
const FinancialReport = require("../models/FinancialReport");

const getWeekStartDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

const getRecentMonthPeriods = (dateString, count) => {
  const current = new Date(`${dateString}T00:00:00.000Z`);
  current.setUTCDate(1);
  current.setUTCMonth(current.getUTCMonth() - count + 1);

  return Array.from({ length: count }, () => {
    const period = {
      key: current.toISOString().slice(0, 7),
      label: current.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
    current.setUTCMonth(current.getUTCMonth() + 1);
    return period;
  });
};

const getFinancialAnalytics = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
    const weekStartStr = getWeekStartDate(todayStr);
    const recentMonthPeriods = getRecentMonthPeriods(todayStr, 3);

const [
      topSellers,
      slowMoving,
      lowStockItems,
      inventoryUsage,
      financialStats,
      dailyTrend,
      monthlyTrend,
      weeklyTrend,
      recentMonthsTrend,
      performanceSummary,
      inventorySummary,
      expiredItems,
    ] = await Promise.all([
      ReportModel.GetTopSellers(),
      ReportModel.GetSlowMoving(),
      InventoryModel.GetLowStockItems(),
      InventoryModel.GetInventoryUsage(),
      FinancialReport.getFinancialStats(todayStr),
      FinancialReport.getDailyProfitTrend(todayStr),
      FinancialReport.getMonthlyProfitTrend(todayStr),
      FinancialReport.getWeeklyProfitTrend(weekStartStr, todayStr),
      FinancialReport.getRecentMonthsTrend(todayStr, 3),
      ReportModel.GetPerformanceSummary(),
      InventoryModel.GetInventorySummary(),
      InventoryModel.GetExpiredItems(),
    ]);

    const calculatedItemsUsed = Number(inventorySummary?.items_used || 0);
    const attentionItems = lowStockItems;
    const calculatedLowStockCount = attentionItems.filter(
      (item) => item.attention_reason === "low_stock",
    ).length;
    const calculatedExpiredCount = attentionItems.filter(
      (item) => item.attention_reason !== "low_stock",
    ).length;

    const weeklyRowsByDate = new Map(
      (weeklyTrend || []).map((item) => [item.date_key, item]),
    );
    const weeklyTrendData = [];
    const currentWeekDate = new Date(`${weekStartStr}T00:00:00.000Z`);
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    while (currentWeekDate <= todayDate) {
      const dateKey = currentWeekDate.toISOString().slice(0, 10);
      const row = weeklyRowsByDate.get(dateKey);
      weeklyTrendData.push({
        date: currentWeekDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        revenue: Number(row?.value || 0),
        orders: Number(row?.orders || 0),
      });
      currentWeekDate.setUTCDate(currentWeekDate.getUTCDate() + 1);
    }

    const recentMonthsByKey = new Map(
      (recentMonthsTrend || []).map((item) => [item.month_key, item]),
    );
    const recentMonthsTrendData = recentMonthPeriods.map((period) => {
      const row = recentMonthsByKey.get(period.key);
      return {
        month: row?.label || period.label,
        revenue: Number(row?.value || 0),
        orders: Number(row?.orders || 0),
      };
    });

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
        expired_count: calculatedExpiredCount,
        expiredCount: calculatedExpiredCount,
        reorder_count: attentionItems.length,
        reorderCount: attentionItems.length,
        need_to_reorder: attentionItems.length,
        needToReorder: attentionItems.length,

        low_stock_list: attentionItems,
        attention_items: attentionItems,
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
          reorder_items: attentionItems.length,
          reorderItems: attentionItems.length,
          expired_count: calculatedExpiredCount,
          expiredCount: calculatedExpiredCount,

          low_stock_count: calculatedLowStockCount,
          lowStockCount: calculatedLowStockCount,
          reorder_count: attentionItems.length,
          reorderCount: attentionItems.length,
          need_to_reorder: attentionItems.length,
          needToReorder: attentionItems.length,

          low_stock_list: attentionItems,
          lowStockList: attentionItems,
          attention_items: attentionItems,
        },

        // Monthly mode displays daily revenue for the current month.
        dailyTrend: (dailyTrend || []).map((item) => ({
          date: item.label,
          revenue: Number(item.value || 0),
        })),

        // Weekly mode displays this week's revenue from Monday through today.
        weeklyTrend: weeklyTrendData,

        // Yearly mode displays one revenue total for each month of the current year.
        monthlyTrend: (monthlyTrend || []).map((item) => ({
          month: item.label,
          revenue: Number(item.value || 0),
        })),

        // Recent months mode always shows the current and previous two months.
        recentMonthsTrend: recentMonthsTrendData,
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
