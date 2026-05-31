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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function drawHeader(doc, title, dateLabel) {
  // Header background bar
  doc.rect(0, 0, doc.page.width, 80).fill("#f59e0b");

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(title, doc.page.margins.left, 28);

  doc
    .fontSize(10)
    .fillColor("#ffffff")
    .text(`Generated: ${dateLabel}`, doc.page.margins.left, 55);

  // Reset fill color
  doc.fillColor("#111827");
  return doc.y;
}

function drawCard(
  doc,
  x,
  y,
  width,
  height,
  label,
  value,
  iconColor = "#f59e0b",
  bgColor = "#ffffff",
) {
  // Card background with shadow effect
  doc.save();
  doc.roundedRect(x, y, width, height, 12).fill("#ffffff");

  // Subtle border
  doc
    .roundedRect(x, y, width, height, 12)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();

  // Top accent bar
  doc.roundedRect(x, y, width, 5, 5).fill(iconColor);

  // Icon circle
  doc.circle(x + 35, y + 35, 18).fill(`${iconColor}15`);
  doc
    .fillColor(iconColor)
    .fontSize(14)
    .text("₱", x + 28, y + 28);

  // Label
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(9)
    .text(label.toUpperCase(), x + 70, y + 22);

  // Value
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(value, x + 70, y + 36);

  doc.restore();
}

function drawTableHeader(doc, startX, startY, columns) {
  // Header background
  doc
    .roundedRect(
      startX - 5,
      startY - 8,
      doc.page.width - doc.page.margins.left - doc.page.margins.right + 10,
      28,
      6,
    )
    .fill("#f8fafc");

  let currentX = startX;
  columns.forEach((col) => {
    doc
      .fillColor("#475569")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(col.label, currentX, startY, {
        width: col.width,
        align: col.align || "left",
      });
    currentX += col.width;
  });

  // Underline
  doc
    .moveTo(startX, startY + 18)
    .lineTo(
      startX + columns.reduce((sum, col) => sum + col.width, 0),
      startY + 18,
    )
    .strokeColor("#e2e8f0")
    .stroke();

  return startY + 24;
}

function drawTableRow(doc, y, columns, values, isAlt = false) {
  let currentX = doc.page.margins.left;

  if (isAlt) {
    doc
      .roundedRect(
        doc.page.margins.left - 5,
        y - 6,
        doc.page.width - doc.page.margins.left - doc.page.margins.right + 10,
        22,
        4,
      )
      .fill("#f8fafc");
  }

  columns.forEach((col, idx) => {
    const value = values[idx];
    const isCurrency =
      typeof value === "number" ||
      (typeof value === "string" && value.includes("₱"));

    doc
      .fillColor("#1f2937")
      .font(isCurrency ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10)
      .text(String(value), currentX, y, {
        width: col.width,
        align: col.align || "left",
      });

    currentX += col.width;
  });

  return y + 22;
}

function drawTrendTable(doc, sectionTitle, trendRows, startY = null) {
  if (!trendRows || trendRows.length === 0) return startY || doc.y;

  let y = startY || doc.y;

  // Section title with accent
  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(sectionTitle, doc.page.margins.left, y);

  y += 24;

  // Draw mini chart indicator
  const chartHeight = 60;
  const chartWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const values = trendRows.map((r) => Number(r.value || r.revenue || 0));
  const maxValue = Math.max(...values, 1);

  doc.save();
  doc
    .roundedRect(doc.page.margins.left, y, chartWidth, chartHeight, 8)
    .fill("#fefce8");

  const step = chartWidth / (values.length - 1 || 1);
  const points = values.map((val, i) => ({
    x: doc.page.margins.left + i * step,
    y: y + chartHeight - (val / maxValue) * (chartHeight - 20),
  }));

  // Draw line
  if (points.length > 1) {
    doc.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i].x, points[i].y);
    }
    doc.lineWidth(2).strokeColor("#f59e0b").stroke();
  }

  // Draw points
  points.forEach((point) => {
    doc.circle(point.x, point.y, 3).fill("#f59e0b");
    doc.circle(point.x, point.y, 5).fill("#f59e0b").opacity(0.2);
  });

  doc.restore();
  y += chartHeight + 16;

  // Table
  const columns = [
    { label: "PERIOD", width: 150, align: "left" },
    { label: "REVENUE / PROFIT", width: 150, align: "right" },
  ];

  y = drawTableHeader(doc, doc.page.margins.left, y, columns);

  trendRows.forEach((row, idx) => {
    const label =
      row.label || row.period || row.month || row.week || row.date || "";
    const value = formatCurrencyPHP(row.value || row.revenue || 0);
    y = drawTableRow(doc, y, columns, [label, value], idx % 2 === 1);

    if (y > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  return y + 16;
}

function buildFinancialPdf({ title, payload }) {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const today = new Date();
  const dateLabel = formatDate(today);

  // Header
  drawHeader(doc, title, dateLabel);
  let y = doc.y + 20;

  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;

  // Profit Cards - Row 1
  const cardWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right - 32) / 3;

  drawCard(
    doc,
    doc.page.margins.left,
    y,
    cardWidth,
    70,
    "Weekly Profit",
    formatCurrencyPHP(profitWeekly),
    "#10b981",
  );
  drawCard(
    doc,
    doc.page.margins.left + cardWidth + 16,
    y,
    cardWidth,
    70,
    "Monthly Profit",
    formatCurrencyPHP(profitMonthly),
    "#f59e0b",
  );
  drawCard(
    doc,
    doc.page.margins.left + (cardWidth + 16) * 2,
    y,
    cardWidth,
    70,
    "Yearly Profit",
    formatCurrencyPHP(profitYearly),
    "#3b82f6",
  );

  y += 90;

  // Stats Cards - Row 2
  const statsCardWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right - 16) / 2;
  const totalOrders = summary.total_orders || 0;
  const avgOrder = summary.aov || 0;

  drawCard(
    doc,
    doc.page.margins.left,
    y,
    statsCardWidth,
    70,
    "Total Orders",
    totalOrders.toLocaleString(),
    "#8b5cf6",
  );
  drawCard(
    doc,
    doc.page.margins.left + statsCardWidth + 16,
    y,
    statsCardWidth,
    70,
    "Average Order Value",
    formatCurrencyPHP(avgOrder),
    "#ec489a",
  );

  y += 90;

  // Divider
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();

  y += 20;

  // Revenue Trends Section
  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Revenue & Profit Analysis", doc.page.margins.left, y);

  y += 12;
  doc
    .fillColor("#6b7280")
    .font("Helvetica")
    .fontSize(10)
    .text(
      "Track your business performance across different time periods",
      doc.page.margins.left,
      y,
    );

  y += 28;

  // Weekly Trend
  y = drawTrendTable(doc, "Weekly Revenue Trend", payload?.trends?.weekly, y);

  // Check if we need a new page for monthly
  if (y > doc.page.height - doc.page.margins.bottom - 200) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Monthly Trend
  y = drawTrendTable(doc, "Monthly Revenue Trend", payload?.trends?.monthly, y);

  // Check if we need a new page for yearly
  if (y > doc.page.height - doc.page.margins.bottom - 150) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Yearly Trend
  y = drawTrendTable(doc, "Yearly Revenue Trend", payload?.trends?.yearly, y);

  // Footer / Disclaimer
  if (y > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Footer line
  doc
    .moveTo(
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 30,
    )
    .lineTo(
      doc.page.width - doc.page.margins.right,
      doc.page.height - doc.page.margins.bottom - 30,
    )
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      "Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders (no expense subtraction).",
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 20,
      {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
      },
    );

  // Page numbers
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(
        `Page ${i + 1} of ${pageCount}`,
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom - 10,
        {
          align: "center",
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
        },
      );
  }

  return doc;
}

module.exports = { buildFinancialPdf };
