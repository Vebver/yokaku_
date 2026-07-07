const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path"); // Added to resolve the path issue

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
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
  const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // ============ SPREADSHEET-STYLE BRANDED HEADER ============

  // Resolves path relative to this script's directory
  const logoPath = path.join(__dirname, "../../frontend/public/favicon.png");
  const hasLogo = fs.existsSync(logoPath);
  let textStartX = 50;

  if (hasLogo) {
    doc.image(logoPath, 50, 40, { width: 45, height: 45 });
    textStartX = 110;
  } else {
    // Helpful log to console to verify path if logo is still missing
    console.warn(`[PDF Export] Logo not found at resolved path: ${logoPath}`);
  }

  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("HANGOUT RESTOBAR", textStartX, 45);

  doc
    .fillColor("#d97706")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(title.toUpperCase(), textStartX, 70);

  // Right Side: Metadata
  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SALESPERSON: Hangout Manager", doc.page.width - 250, 48, {
      align: "right",
      width: 200,
    });

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text(
      "LOCATION: Purok 3, Ibayo, Marilao, Bulacan, 3019",
      doc.page.width - 250,
      62,
      { align: "right", width: 200 },
    );

  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(8)
    .text(`DATE: ${dateLabel}`, doc.page.width - 250, 76, {
      align: "right",
      width: 200,
    });

  // Thin header decorative rule
  doc
    .moveTo(50, 95)
    .lineTo(doc.page.width - 50, 95)
    .strokeColor("#e2e8f0")
    .lineWidth(0.8)
    .stroke();

  doc.y = 115;

  // ============ STATS METRICS (HORIZONTAL ROW LAYOUT) ============
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const startX = 50;
  const totalWidth = doc.page.width - 100;
  const cardWidth5Col = (totalWidth - 48) / 5;
  let cardY = doc.y;

  function renderCard(x, label, value, subtext = null, isNumber = false) {
    const displayValue = isNumber
      ? value.toLocaleString()
      : formatCurrencyPHP(value);

    doc.fillColor("#ffffff").roundedRect(x, cardY, cardWidth5Col, 65, 8).fill();
    doc
      .roundedRect(x, cardY, cardWidth5Col, 65, 8)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();

    doc.rect(x, cardY, 3, 65).fillColor("#eab308").fill();

    doc
      .fillColor("#64748b")
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(label, x + 12, cardY + 12);

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

  renderCard(startX, "WEEKLY REVENUE", profitWeekly);
  renderCard(
    startX + (cardWidth5Col + 12) * 1,
    "MONTHLY REVENUE",
    profitMonthly,
  );
  renderCard(startX + (cardWidth5Col + 12) * 2, "YEARLY REVENUE", profitYearly);
  renderCard(
    startX + (cardWidth5Col + 12) * 3,
    "TOTAL ORDERS",
    totalOrders,
    "Completed orders",
    true,
  );
  renderCard(
    startX + (cardWidth5Col + 12) * 4,
    "AVERAGE ORDER VALUE",
    avgOrder,
    "Per transaction",
  );

  doc.y = cardY + 85;

  // ============ SECTION DIVIDER ============
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("Activity Trends Analysis", startX, doc.y, {
      align: "center",
      width: totalWidth,
    });

  doc.moveDown(1.0);

  // ============ TREND TABLES (SIDE-BY-SIDE COLUMN LAYOUT) ============
  function renderTrendTable(title, trends, x, startY, width) {
    if (!trends || trends.length === 0) return;

    const rowHeight = 16;
    const headerHeight = 22;
    const totalsHeight = 20;

    let y = startY;

    doc
      .fillColor("#d97706")
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text(title.toUpperCase(), x, y);

    y += 16;

    doc.rect(x, y, width, headerHeight).fillColor("#ffffff").fill();
    doc
      .rect(x, y, width, headerHeight)
      .strokeColor("#cbd5e1")
      .lineWidth(0.5)
      .stroke();

    const textY = y + 7;
    doc.fillColor("#facc15").font("Helvetica-Bold").fontSize(7.5);
    doc.text("PERIOD", x + 10, textY, { width: width / 2 - 10, align: "left" });
    doc.text("REVENUE", x + width / 2, textY, {
      width: width / 2 - 10,
      align: "right",
    });

    y += headerHeight;

    let totalActual = 0;

    trends.forEach((item, idx) => {
      const period =
        item.label || item.period || item.month || item.week || item.date || "";
      const actualVal = Number(item.value || item.revenue || 0);

      totalActual += actualVal;

      doc
        .rect(x, y, width, rowHeight)
        .strokeColor("#cbd5e1")
        .lineWidth(0.5)
        .stroke();

      doc.fillColor("#334155").font("Helvetica").fontSize(8);
      doc.text(period, x + 10, y + 4, { width: width / 2 - 10, align: "left" });
      doc.text(formatCurrencyPHP(actualVal), x + width / 2, y + 4, {
        width: width / 2 - 10,
        align: "right",
      });

      y += rowHeight;
    });

    doc.rect(x, y, width, totalsHeight).fillColor("#1e293b").fill();
    doc
      .rect(x, y, width, totalsHeight)
      .strokeColor("#cbd5e1")
      .lineWidth(0.5)
      .stroke();

    doc.fillColor("#facc15").font("Helvetica-Bold").fontSize(8.5);
    doc.text("Totals", x + 10, y + 6, { width: width / 2 - 10, align: "left" });
    doc.text(formatCurrencyPHP(totalActual), x + width / 2, y + 6, {
      width: width / 2 - 10,
      align: "right",
    });
  }

  const tableStartY = doc.y;
  const colWidth = (totalWidth - 30) / 3;
  const colX1 = startX;
  const colX2 = startX + colWidth + 15;
  const colX3 = startX + (colWidth + 15) * 2;

  renderTrendTable(
    "Weekly Revenue Trend",
    payload?.trends?.weekly,
    colX1,
    tableStartY,
    colWidth,
  );
  renderTrendTable(
    "Monthly Revenue Trend",
    payload?.trends?.monthly,
    colX2,
    tableStartY,
    colWidth,
  );
  renderTrendTable(
    "Yearly Revenue Trend",
    payload?.trends?.yearly,
    colX3,
    tableStartY,
    colWidth,
  );

  // ============ FOOTER SECTION WITH ADDRESS ============
  // Moved footer up to height - 75 to keep it safely within the page boundaries
  const footerY = doc.page.height - 75;

  // Footer divider rule (Moved up in proportion)
  doc
    .moveTo(50, footerY - 12)
    .lineTo(doc.page.width - 50, footerY - 12)
    .strokeColor("#cbd5e1")
    .lineWidth(0.5)
    .stroke();

  // Footer address text
  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      "Hangout Restobar | Purok 3, Ibayo, Marilao, Bulacan, 3019 (PS Bank RCH Building near 7-Eleven) | abrevointernational@gmail.com",
      50,
      footerY,
      {
        align: "center",
        width: doc.page.width - 100,
      },
    );

  return doc;
}

module.exports = { buildFinancialPdf };
