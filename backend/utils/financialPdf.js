const PDFDocument = require("pdfkit");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  // Using "PHP" instead of the "₱" symbol to avoid standard font encoding issues (the "±" bug)
  return `PHP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  doc.moveDown(0.3);
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(9)
    .text(`Generated: ${dateLabel}`, { align: "center" });

  doc.moveDown(1.2);

  // Decorative line
  doc
    .moveTo(80, doc.y)
    .lineTo(doc.page.width - 80, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(0.8)
    .stroke();

  doc.moveDown(1.5);

  // ============ STATS CARDS ============
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const startX = 50;
  const totalWidth = doc.page.width - 100;
  const cardWidth3Col = (totalWidth - 24) / 3; // Width for 3-column layout
  const cardWidth2Col = (totalWidth - 12) / 2; // Width for 2-column layout
  let cardY = doc.y;

  function renderCard(x, label, value, subtext = null, isNumber = false, customWidth = cardWidth3Col) {
    const displayValue = isNumber
      ? value.toLocaleString()
      : formatCurrencyPHP(value);

    // Card background
    doc.fillColor("#ffffff").roundedRect(x, cardY, customWidth, 80, 10).fill();
    doc
      .roundedRect(x, cardY, customWidth, 80, 10)
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
      .text(label, x + 28, cardY + 14);

    // Value
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(displayValue, x + 18, cardY + 38);

    if (subtext) {
      doc
        .fillColor("#94a3b8")
        .font("Helvetica")
        .fontSize(7)
        .text(subtext, x + 18, cardY + 62);
    }
  }

  // Row 1: 3 Columns
  renderCard(startX, "WEEKLY PROFIT", profitWeekly, null, false, cardWidth3Col);
  renderCard(startX + cardWidth3Col + 12, "MONTHLY PROFIT", profitMonthly, null, false, cardWidth3Col);
  renderCard(startX + (cardWidth3Col + 12) * 2, "YEARLY PROFIT", profitYearly, null, false, cardWidth3Col);

  cardY += 95;

  // Row 2: 2 Columns (balanced across the entire page width)
  renderCard(startX, "TOTAL ORDERS", totalOrders, "Completed orders", true, cardWidth2Col);
  renderCard(
    startX + cardWidth2Col + 12,
    "AVERAGE ORDER VALUE",
    avgOrder,
    "Per transaction",
    false,
    cardWidth2Col
  );

  doc.y = cardY + 95; // Reset doc cursor position below the cards

  // ============ SECTION DIVIDER ============
  // Explicitly set X coordinate and width so centering spans the full page correctly
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Revenue & Profit Analysis", 50, doc.y, { align: "center", width: totalWidth });

  doc.moveDown(0.3);
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(9)
    .text("Track your business performance across different time periods", 50, doc.y, {
      align: "center",
      width: totalWidth
    });

  doc.moveDown(1.5);

  // ============ TREND TABLES ============
  function renderTrendTable(title, trends) {
    if (!trends || trends.length === 0) return;

    const startTableY = doc.y;

    // Section background
    doc
      .fillColor("#f8fafc")
      .roundedRect(
        45,
        startTableY,
        doc.page.width - 90,
        50 + trends.length * 30,
        8,
      )
      .fill();

    // "PERFORMANCE" tag
    doc
      .fillColor("#f59e0b")
      .font("Helvetica-Bold")
      .fontSize(7)
      .text("PERFORMANCE", 65, startTableY + 12);

    // Title
    doc
      .fillColor("#1e293b")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(title, 65, startTableY + 26);

    let y = startTableY + 52;

    // Table header
    doc
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("PERIOD", 65, y);
    doc.text("REVENUE", doc.page.width - 150, y, { width: 100, align: "right" });

    y += 6;
    doc
      .moveTo(60, y)
      .lineTo(doc.page.width - 60, y)
      .strokeColor("#cbd5e1")
      .lineWidth(0.5)
      .stroke();

    y += 14;

    // Table rows
    trends.forEach((item, idx) => {
      const period =
        item.label || item.period || item.month || item.week || item.date || "";
      const revenue = formatCurrencyPHP(item.value || item.revenue || 0);

      // Row background for alternating rows
      if (idx % 2 === 1) {
        doc
          .fillColor("#f1f5f9")
          .roundedRect(58, y - 6, doc.page.width - 116, 26, 4)
          .fill();
      }

      doc
        .fillColor("#334155")
        .font("Helvetica")
        .fontSize(10)
        .text(period, 65, y);
      doc.text(revenue, doc.page.width - 150, y, { width: 100, align: "right" });

      y += 30;
    });

    // Position after the table
    doc.y = y + 15;
  }

  renderTrendTable("Weekly Revenue Trend", payload?.trends?.weekly);
  renderTrendTable("Monthly Revenue Trend", payload?.trends?.monthly);
  renderTrendTable("Yearly Revenue Trend", payload?.trends?.yearly);

  // ============ FOOTER ============
  if (doc.y < doc.page.height - 100) {
    doc.y = doc.page.height - 85;
  } else {
    doc.addPage();
    doc.y = doc.page.height - 85;
  }

  doc
    .moveTo(60, doc.y)
    .lineTo(doc.page.width - 60, doc.y)
    .strokeColor("#e2e8f0")
    .lineWidth(0.5)
    .stroke();

  doc.moveDown(0.5);
  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(7)
    .text(
      "Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders.",
      50,
      doc.y,
      { width: totalWidth, align: "center" },
    );

  doc.moveDown(0.3);
  doc
    .fillColor("#cbd5e1")
    .font("Helvetica")
    .fontSize(7)
    .text(
      "No operational expenses have been deducted from these figures.",
      50,
      doc.y,
      { width: totalWidth, align: "center" },
    );

  return doc;
}

module.exports = { buildFinancialPdf };