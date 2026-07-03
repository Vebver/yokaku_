const PDFDocument = require("pdfkit");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  // Using "PHP" instead of the "₱" symbol to avoid standard font encoding issues
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
  // Configured in Landscape orientation with A4 specifications
  const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // ============ SPREADSHEET-STYLE BRANDED HEADER ============
  // Left Side: Brand & Section Name
  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("HANGOUT RESTOBAR", 50, 45);

  doc
    .fillColor("#c2410c") 
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(title.toUpperCase(), 50, 70);

  // Right Side: Metadata (Spreadsheet Persona)
  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SALESPERSON: Hangout Manager", doc.page.width - 250, 48, { align: "right", width: 200 });

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text("LOCATION: Purok 3, Ibayo, Marilao, Bulacan, 3019", doc.page.width - 250, 62, { align: "right", width: 200 });

  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(8)
    .text(`DATE: ${dateLabel}`, doc.page.width - 250, 76, { align: "right", width: 200 });

  // Thin header decorative rule
  doc
    .moveTo(50, 95)
    .lineTo(doc.page.width - 50, 95)
    .strokeColor("#e2e8f0")
    .lineWidth(0.8)
    .stroke();

  doc.y = 115; // Set starting Y coordinate below the header section

  // ============ STATS METRICS (HORIZONTAL ROW LAYOUT) ============
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const startX = 50;
  const totalWidth = doc.page.width - 100;
  const cardWidth5Col = (totalWidth - 48) / 5; // Width for 5 horizontal columns
  let cardY = doc.y;

  function renderCard(x, label, value, subtext = null, isNumber = false) {
    const displayValue = isNumber
      ? value.toLocaleString()
      : formatCurrencyPHP(value);

    // Card background box
    doc.fillColor("#ffffff").roundedRect(x, cardY, cardWidth5Col, 65, 8).fill();
    doc
      .roundedRect(x, cardY, cardWidth5Col, 65, 8)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();

    // Solid Green Left-Accent Bar
    doc.rect(x, cardY, 3, 65).fillColor("#5f9d78").fill();

    // Metric Label
    doc
      .fillColor("#64748b")
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(label, x + 12, cardY + 12);

    // Metric Value
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(displayValue, x + 12, cardY + 26, { width: cardWidth5Col - 20 });

    if (subtext) {
      doc
        .fillColor("#94a3b8")
        .font("Helvetica")
        .fontSize(6.5)
        .text(subtext, x + 12, cardY + 44, { width: cardWidth5Col - 20 });
    }
  }

  // Render 5 horizontal metric cards side-by-side
  renderCard(startX, "WEEKLY REVENUE", profitWeekly);
  renderCard(startX + (cardWidth5Col + 12) * 1, "MONTHLY REVENUE", profitMonthly);
  renderCard(startX + (cardWidth5Col + 12) * 2, "YEARLY REVENUE", profitYearly);
  renderCard(startX + (cardWidth5Col + 12) * 3, "TOTAL ORDERS", totalOrders, "Completed orders", true);
  renderCard(startX + (cardWidth5Col + 12) * 4, "AVERAGE ORDER VALUE", avgOrder, "Per transaction");

  doc.y = cardY + 85; // Set starting point for analysis tables below cards

  // ============ SECTION DIVIDER ============
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .fontSize(15)
    // Fixed: Horizontal alignment bounds explicitly reset
    .text("Activity Trends Analysis", startX, doc.y, { align: "center", width: totalWidth });

  doc.moveDown(1.0);

  // ============ TREND TABLES (SIDE-BY-SIDE COLUMN LAYOUT) ============
  function renderTrendTable(title, trends, x, startY, width) {
    if (!trends || trends.length === 0) return;

    const rowHeight = 16; 
    const headerHeight = 22;
    const totalsHeight = 20;

    let y = startY;

    // Table Header title (Green tint, left-aligned)
    doc
      .fillColor("#5f9d78")
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text(title.toUpperCase(), x, y);

    y += 16;

    // Table Header Row Box
    doc.rect(x, y, width, headerHeight).fillColor("#ffffff").fill();
    doc.rect(x, y, width, headerHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

    const textY = y + 7;
    doc.fillColor("#c2410c").font("Helvetica-Bold").fontSize(7.5);
    doc.text("PERIOD", x + 10, textY, { width: width / 2 - 10, align: "left" });
    doc.text("REVENUE", x + width / 2, textY, { width: width / 2 - 10, align: "right" });

    y += headerHeight;

    let totalActual = 0;

    // Table Data Rows
    trends.forEach((item, idx) => {
      const period = item.label || item.period || item.month || item.week || item.date || "";
      const actualVal = Number(item.value || item.revenue || 0);

      totalActual += actualVal;

      // Draw grid row outline
      doc.rect(x, y, width, rowHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

      // Render cells
      doc.fillColor("#334155").font("Helvetica").fontSize(8);
      doc.text(period, x + 10, y + 4, { width: width / 2 - 10, align: "left" });
      doc.text(formatCurrencyPHP(actualVal), x + width / 2, y + 4, { width: width / 2 - 10, align: "right" });

      y += rowHeight;
    });

    // ============ GREEN TOTALS ROW ============
    doc.rect(x, y, width, totalsHeight).fillColor("#5f9d78").fill();
    doc.rect(x, y, width, totalsHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8.5);
    doc.text("Totals", x + 10, y + 6, { width: width / 2 - 10, align: "left" });
    doc.text(formatCurrencyPHP(totalActual), x + width / 2, y + 6, { width: width / 2 - 10, align: "right" });
  }

  // Calculate layout coordinates for 3 columns side-by-side with a 15px gap
  const tableStartY = doc.y;
  const colWidth = (totalWidth - 30) / 3;
  const colX1 = startX;
  const colX2 = startX + colWidth + 15;
  const colX3 = startX + (colWidth + 15) * 2;

  // Render the three tables inside the side-by-side parallel columns
  renderTrendTable("Weekly Revenue Trend", payload?.trends?.weekly, colX1, tableStartY, colWidth);
  renderTrendTable("Monthly Revenue Trend", payload?.trends?.monthly, colX2, tableStartY, colWidth);
  renderTrendTable("Yearly Revenue Trend", payload?.trends?.yearly, colX3, tableStartY, colWidth);

  // ============ FOOTER SECTION WITH ADDRESS ============
  const footerY = doc.page.height - 45;
  
  // Footer divider rule
  doc
    .moveTo(50, footerY - 10)
    .lineTo(doc.page.width - 50, footerY - 10)
    .strokeColor("#cbd5e1")
    .lineWidth(0.5)
    .stroke();

  // Footer address text
  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(7.5)
    .text("Hangout Restobar | Purok 3, Ibayo, Marilao, Bulacan, 3019 (PS Bank RCH Building near 7-Eleven) | abrevointernational@gmail.com", 50, footerY, {
      align: "center",
      width: doc.page.width - 100,
    });

  return doc;
}

module.exports = { buildFinancialPdf };