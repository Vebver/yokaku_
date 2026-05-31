const PDFDocument = require("pdfkit");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildFinancialPdf({ title, payload }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // ============ HEADER SECTION ============
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(title, { align: "center" });

  doc.moveDown(0.2);
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(9)
    .text(`Generated: ${dateLabel}`, { align: "center" });

  doc.moveDown(1);

  // Decorative line
  doc
    .moveTo(100, doc.y)
    .lineTo(doc.page.width - 100, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(0.8)
    .stroke();

  doc.moveDown(1.2);

  // ============ STATS CARDS ============
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const cardWidth = (doc.page.width - 100 - 20) / 3;
  const startX = 50;
  let cardY = doc.y;

  function renderCard(x, label, value, subtext = null) {
    const displayValue =
      typeof value === "number" && label.includes("ORDERS")
        ? value.toLocaleString()
        : formatCurrencyPHP(value);

    // Card background
    doc.fillColor("#ffffff").roundedRect(x, cardY, cardWidth, 85, 10).fill();
    doc
      .roundedRect(x, cardY, cardWidth, 85, 10)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();

    // Tiny accent dot
    doc.circle(x + 18, cardY + 18, 3).fill("#f59e0b");

    // Label
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(8)
      .text(label, x + 18, cardY + 14);

    // Value
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(displayValue, x + 18, cardY + 34);

    if (subtext) {
      doc
        .fillColor("#94a3b8")
        .font("Helvetica")
        .fontSize(7)
        .text(subtext, x + 18, cardY + 60);
    }
  }

  renderCard(startX, "WEEKLY PROFIT", profitWeekly);
  renderCard(startX + cardWidth + 10, "MONTHLY PROFIT", profitMonthly);
  renderCard(startX + (cardWidth + 10) * 2, "YEARLY PROFIT", profitYearly);

  cardY += 100;

  const halfWidth = (doc.page.width - 100 - 10) / 2;

  renderCard(startX, "TOTAL ORDERS", totalOrders, "Completed orders");
  renderCard(
    startX + halfWidth + 10,
    "AVERAGE ORDER VALUE",
    avgOrder,
    "Per transaction",
  );

  doc.moveDown(5);

  // ============ SECTION DIVIDER ============
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Revenue & Profit Analysis", { align: "center" });

  doc.moveDown(0.2);
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(9)
    .text("Track your business performance across different time periods", {
      align: "center",
    });

  doc.moveDown(1.2);

  // ============ TREND TABLES ============
  function renderTrendTable(title, trends, isLast = false) {
    if (!trends || trends.length === 0) return;

    // Section background
    const bgY = doc.y - 5;
    doc
      .fillColor("#f8fafc")
      .roundedRect(45, bgY, doc.page.width - 90, 35 + trends.length * 28, 8)
      .fill();

    // Title with accent
    doc
      .fillColor("#f59e0b")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("PERFORMANCE", 65, bgY + 12);

    doc
      .fillColor("#1e293b")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(title, 65, bgY + 24);

    let y = bgY + 55;

    // Table header
    doc
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("PERIOD", 65, y);
    doc.text("REVENUE", doc.page.width - 130, y, { width: 80, align: "right" });

    y += 5;
    doc
      .moveTo(60, y)
      .lineTo(doc.page.width - 60, y)
      .strokeColor("#cbd5e1")
      .lineWidth(0.5)
      .stroke();

    y += 12;

    // Table rows
    trends.forEach((item, idx) => {
      const period =
        item.label || item.period || item.month || item.week || item.date || "";
      const revenue = formatCurrencyPHP(item.value || item.revenue || 0);

      // Row background for alternating
      if (idx % 2 === 1) {
        doc
          .fillColor("#f1f5f9")
          .roundedRect(58, y - 6, doc.page.width - 116, 24, 4)
          .fill();
      }

      doc
        .fillColor("#334155")
        .font("Helvetica")
        .fontSize(10)
        .text(period, 65, y);
      doc.text(revenue, doc.page.width - 130, y, { width: 80, align: "right" });

      y += 26;
    });

    doc.moveDown(isLast ? 1 : 1.5);
  }

  renderTrendTable("Weekly Revenue Trend", payload?.trends?.weekly);
  renderTrendTable("Monthly Revenue Trend", payload?.trends?.monthly);
  renderTrendTable("Yearly Revenue Trend", payload?.trends?.yearly, true);

  // ============ FOOTER ============
  const footerY = doc.page.height - 55;

  doc
    .moveTo(60, footerY - 15)
    .lineTo(doc.page.width - 60, footerY - 15)
    .strokeColor("#e2e8f0")
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(7)
    .text(
      "Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders.",
      50,
      footerY,
      { width: doc.page.width - 100, align: "center" },
    );

  doc
    .fillColor("#cbd5e1")
    .font("Helvetica")
    .fontSize(7)
    .text(
      "No operational expenses have been deducted from these figures.",
      50,
      footerY + 12,
      { width: doc.page.width - 100, align: "center" },
    );

  return doc;
}

module.exports = { buildFinancialPdf };
