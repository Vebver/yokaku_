const PDFDocument = require("pdfkit");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function formatDate(date) {
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildFinancialPdf({ title, payload }) {
  const doc = new PDFDocument({ margin: 60, size: "A4" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // ============ HEADER ============
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text(title, { align: "center" });

  doc.moveDown(0.3);
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(10)
    .text(`Generated: ${dateLabel}`, { align: "center" });

  doc.moveDown(1.5);

  // Light separator line
  doc
    .moveTo(60, doc.y)
    .lineTo(doc.page.width - 60, doc.y)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();

  doc.moveDown(1.2);

  // ============ SUMMARY CARDS ============
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const cardWidth = (doc.page.width - 120 - 24) / 3;
  const startX = 60;
  let cardY = doc.y;

  // Card helper
  function renderCard(x, label, value, prefix = "₱") {
    const displayValue =
      prefix === "₱" ? formatCurrencyPHP(value) : value.toLocaleString();

    doc.fillColor("#ffffff").roundedRect(x, cardY, cardWidth, 70, 8).fill();
    doc
      .roundedRect(x, cardY, cardWidth, 70, 8)
      .strokeColor("#e5e7eb")
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor("#6b7280")
      .font("Helvetica")
      .fontSize(9)
      .text(label, x + 16, cardY + 18);

    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(displayValue, x + 16, cardY + 36);
  }

  renderCard(startX, "WEEKLY PROFIT", profitWeekly);
  renderCard(startX + cardWidth + 12, "MONTHLY PROFIT", profitMonthly);
  renderCard(startX + (cardWidth + 12) * 2, "YEARLY PROFIT", profitYearly);

  cardY += 85;

  const statsCardWidth = (doc.page.width - 120 - 12) / 2;

  renderCard(startX, "TOTAL ORDERS", totalOrders, "#");
  renderCard(startX + statsCardWidth + 12, "AVERAGE ORDER VALUE", avgOrder);

  doc.moveDown(6.5);

  // ============ SECTION TITLE ============
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Revenue & Profit Analysis", { align: "center" });

  doc.moveDown(0.3);
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(9)
    .text("Track your business performance across different time periods", {
      align: "center",
    });

  doc.moveDown(1.2);

  // ============ TREND TABLES ============
  function renderTrendTable(title, trends) {
    if (!trends || trends.length === 0) return;

    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(title);

    doc.moveDown(0.8);

    // Table Header
    const headerY = doc.y;
    doc
      .fillColor("#9ca3af")
      .font("Helvetica")
      .fontSize(9)
      .text("Period", 60, headerY);
    doc.text("Revenue", doc.page.width - 140, headerY, {
      width: 80,
      align: "right",
    });

    doc.moveDown(0.5);
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#e5e7eb")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);

    // Table Rows
    trends.forEach((item, idx) => {
      const period =
        item.label || item.period || item.month || item.week || item.date || "";
      const revenue = formatCurrencyPHP(item.value || item.revenue || 0);

      doc
        .fillColor(idx % 2 === 0 ? "#ffffff" : "#f9fafb")
        .roundedRect(58, doc.y - 4, doc.page.width - 116, 24, 4)
        .fill();

      doc
        .fillColor("#374151")
        .font("Helvetica")
        .fontSize(10)
        .text(period, 60, doc.y);
      doc.text(revenue, doc.page.width - 140, doc.y, {
        width: 80,
        align: "right",
      });

      doc.moveDown(1.3);
    });

    doc.moveDown(0.5);
  }

  renderTrendTable("Weekly Revenue Trend", payload?.trends?.weekly);
  renderTrendTable("Monthly Revenue Trend", payload?.trends?.monthly);
  renderTrendTable("Yearly Revenue Trend", payload?.trends?.yearly);

  // ============ FOOTER NOTE ============
  const footerY = doc.page.height - 50;
  if (doc.y > footerY - 80) {
    doc.addPage();
  }

  doc
    .moveTo(60, doc.page.height - 70)
    .lineTo(doc.page.width - 60, doc.page.height - 70)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor("#9ca3af")
    .font("Helvetica")
    .fontSize(8)
    .text(
      "Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders (no expense subtraction).",
      60,
      doc.page.height - 55,
      { width: doc.page.width - 120, align: "center" },
    );

  return doc;
}

module.exports = { buildFinancialPdf };
