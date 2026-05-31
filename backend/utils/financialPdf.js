const PDFDocument = require("pdfkit");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function formatDate(date) {
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function drawCard(doc, x, y, width, label, value, color = "#f59e0b") {
  // Card background
  doc.roundedRect(x, y, width, 65, 10).fill("#ffffff");
  doc
    .roundedRect(x, y, width, 65, 10)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();

  // Top accent bar
  doc.roundedRect(x, y, width, 4, 2).fill(color);

  // Label
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(9)
    .text(label.toUpperCase(), x + 15, y + 18);

  // Value
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(value, x + 15, y + 34);
}

function drawTable(doc, title, rows, startY) {
  if (!rows || rows.length === 0) return startY;

  let y = startY;

  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(title, doc.page.margins.left, y);

  y += 20;

  // Table header
  doc
    .fillColor("#475569")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Period", doc.page.margins.left, y);
  doc.text("Revenue", doc.page.width - doc.page.margins.right - 80, y, {
    width: 80,
    align: "right",
  });

  y += 4;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#e2e8f0")
    .stroke();

  y += 10;

  rows.forEach((row, idx) => {
    const label =
      row.label || row.period || row.month || row.week || row.date || "";
    const value = formatCurrencyPHP(row.value || row.revenue || 0);

    if (idx % 2 === 1) {
      doc
        .roundedRect(
          doc.page.margins.left - 5,
          y - 6,
          doc.page.width - doc.page.margins.left - doc.page.margins.right + 10,
          20,
          4,
        )
        .fill("#f8fafc");
    }

    doc
      .fillColor("#1f2937")
      .font("Helvetica")
      .fontSize(10)
      .text(label, doc.page.margins.left, y);
    doc.text(value, doc.page.width - doc.page.margins.right - 80, y, {
      width: 80,
      align: "right",
    });

    y += 20;

    if (y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  return y + 15;
}

function buildFinancialPdf({ title, payload }) {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // Header
  doc.rect(0, 0, doc.page.width, 70).fill("#f59e0b");
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(title, doc.page.margins.left, 25);
  doc
    .fontSize(9)
    .fillColor("#ffffff")
    .text(`Generated: ${dateLabel}`, doc.page.margins.left, 52);

  let y = doc.y + 30;

  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  const cardWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right - 32) / 3;

  // Row 1: Profit Cards
  drawCard(
    doc,
    doc.page.margins.left,
    y,
    cardWidth,
    "Weekly Profit",
    formatCurrencyPHP(profitWeekly),
    "#10b981",
  );
  drawCard(
    doc,
    doc.page.margins.left + cardWidth + 16,
    y,
    cardWidth,
    "Monthly Profit",
    formatCurrencyPHP(profitMonthly),
    "#f59e0b",
  );
  drawCard(
    doc,
    doc.page.margins.left + (cardWidth + 16) * 2,
    y,
    cardWidth,
    "Yearly Profit",
    formatCurrencyPHP(profitYearly),
    "#3b82f6",
  );

  y += 80;

  const statsCardWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right - 16) / 2;

  // Row 2: Stats Cards
  drawCard(
    doc,
    doc.page.margins.left,
    y,
    statsCardWidth,
    "Total Orders",
    totalOrders.toLocaleString(),
    "#8b5cf6",
  );
  drawCard(
    doc,
    doc.page.margins.left + statsCardWidth + 16,
    y,
    statsCardWidth,
    "Average Order Value",
    formatCurrencyPHP(avgOrder),
    "#ec489a",
  );

  y += 80;

  // Divider
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#e2e8f0")
    .stroke();

  y += 20;

  // Section Title
  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Revenue & Profit Analysis", doc.page.margins.left, y);

  y += 12;
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Track your business performance across different time periods",
      doc.page.margins.left,
      y,
    );

  y += 25;

  // Tables
  y = drawTable(doc, "Weekly Revenue Trend", payload?.trends?.weekly, y);

  if (y > doc.page.height - doc.page.margins.bottom - 150) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y = drawTable(doc, "Monthly Revenue Trend", payload?.trends?.monthly, y);

  if (y > doc.page.height - doc.page.margins.bottom - 150) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y = drawTable(doc, "Yearly Revenue Trend", payload?.trends?.yearly, y);

  // Footer
  if (y > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  doc
    .moveTo(
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 40,
    )
    .lineTo(
      doc.page.width - doc.page.margins.right,
      doc.page.height - doc.page.margins.bottom - 40,
    )
    .strokeColor("#e2e8f0")
    .stroke();

  doc
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      "Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders (no expense subtraction).",
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 30,
      { align: "center" },
    );

  return doc;
}

module.exports = { buildFinancialPdf };
