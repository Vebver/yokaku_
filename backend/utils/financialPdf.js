const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  return `PHP ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateLong(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function buildFinancialPdf({ title, payload, startDate, endDate }) {
  // Reduced margins to prevent unwanted page breaks
  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
  
  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ============ BRANDED HEADER (COMPACT) ============
  const logoPath = path.join(__dirname, "../../frontend/public/favicon.png");
  const hasLogo = fs.existsSync(logoPath);
  let textStartX = 40;

  if (hasLogo) {
    doc.image(logoPath, 40, 30, { width: 35, height: 35 });
    textStartX = 85;
  }

  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text("HANGOUT RESTOBAR", textStartX, 35);
  doc.fillColor("#d97706").font("Helvetica-Bold").fontSize(9).text("FINANCIAL PERFORMANCE REPORT", textStartX, 58);

  // ============ METADATA (TOP RIGHT) ============
  const metaX = doc.page.width - 240;
  doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.5).text("SALESPERSON: Hangout Manager", metaX, 35, { align: "right", width: 200 });
  doc.text("LOCATION: Purok 3, Ibayo, Marilao, Bulacan, 3019", metaX, 45, { align: "right", width: 200 });
  doc.fillColor("#94a3b8").font("Helvetica").text(`DATE: ${today}`, metaX, 55, { align: "right", width: 200 });

  // ============ REPORTING PERIOD BOX (COMPACT) ============
  const rangeX = doc.page.width - 240;
  const rangeY = 115;
  doc.fillColor("#f8fafc").roundedRect(rangeX, rangeY, 200, 32, 5).fill();
  doc.lineWidth(0.5).strokeColor("#e2e8f0").roundedRect(rangeX, rangeY, 200, 32, 5).stroke();
  doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7).text("REPORTING PERIOD", rangeX + 10, rangeY + 6);
  
  const startDisplay = formatDateLong(startDate);
  const endDisplay = formatDateLong(endDate);
  const dateRangeString = (startDisplay && endDisplay) ? `${startDisplay} — ${endDisplay}` : "All Time History";
  doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8).text(dateRangeString, rangeX + 10, rangeY + 16);

  // ============ DIVIDER ============
  doc.moveTo(40, 110).lineTo(doc.page.width - 40, 110).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

  // ============ ACTIVITY TRENDS ANALYSIS ============
  doc.y = 120;
  
  // Set a comfortable, centered width for a single table on a landscape sheet
  const colWidth = 460;
  const tableStartX = (doc.page.width - colWidth) / 2;
  const tableStartY = 160; 

  doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(14).text("Monthly Revenue", tableStartX, doc.y);

  // ============ GENERATE MONTHLY RANGE INCLUDING ZEROES ============
  let monthlyTrend = payload?.trends?.monthly || [];

  if (startDate && endDate) {
    const [startYear, startMonth] = startDate.split("-").map(Number);
    const [endYear, endMonth] = endDate.split("-").map(Number);
    const rowMap = new Map(
      monthlyTrend.map((row) => [
        row.month_key,
        Number(row.value || row.revenue || 0),
      ]),
    );
    const filledTrends = [];
    let year = startYear;
    let month = startMonth;

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      filledTrends.push({ label, value: rowMap.get(monthKey) || 0 });
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    monthlyTrend = filledTrends;
  }

  function renderTrendTable(tableTitle, trends, x, startY, width) {
    if (!trends || trends.length === 0) return;
    
    let localY = startY;
    const rowHeight = 14;    
    const headerHeight = 18; 

    doc.fillColor("#d97706").font("Helvetica-Bold").fontSize(8.5).text(tableTitle.toUpperCase(), x, localY);
    localY += 12;

    const drawHeader = (yCoord) => {
      doc.rect(x, yCoord, width, headerHeight).fillColor("#f8fafc").fill();
      doc.rect(x, yCoord, width, headerHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(7).text("MONTH", x + 8, yCoord + 5);
      doc.text("REVENUE", x + width / 2, yCoord + 5, { width: width / 2 - 8, align: "right" });
    };

    drawHeader(localY);
    localY += headerHeight;
    let total = 0;

    trends.forEach((item) => {
      const val = Number(item.value || item.revenue || 0);
      total += val;

      // Automatically add a new page if the table overflows the bottom margin
      if (localY > doc.page.height - 45) {
        doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
        localY = 40; // Reset top Y spacing on the new page
        drawHeader(localY);
        localY += headerHeight;
      }

      doc.rect(x, localY, width, rowHeight).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc.fillColor("#334155").font("Helvetica").fontSize(7.5).text(item.label || "N/A", x + 8, localY + 3.5);
      doc.text(formatCurrencyPHP(val), x + width / 2, localY + 3.5, { width: width / 2 - 8, align: "right" });
      localY += rowHeight;
    });

    // Handle potential overflow page shift for the total row
    if (localY > doc.page.height - 45) {
      doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
      localY = 40;
    }

    // Total Row
    doc.rect(x, localY, width, rowHeight).fillColor("#f1f5f9").fill();
    doc.rect(x, localY, width, rowHeight).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5).text("TOTAL", x + 8, localY + 3.5);
    doc.text(formatCurrencyPHP(total), x + width / 2, localY + 3.5, { width: width / 2 - 8, align: "right" });
  }

  // Draw the monthly revenue table centered on the page
  renderTrendTable("Monthly Performance", monthlyTrend, tableStartX, tableStartY, colWidth);

  // ============ FOOTER SECTION ============
  const footerY = doc.page.height - 25; 
  doc.save();
  doc.moveTo(40, footerY - 8).lineTo(doc.page.width - 40, footerY - 8).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(6.5).text(
    "Generated by Hangout System | Official Financial Document",
    40, footerY, { align: "center", width: doc.page.width - 80 }
  );
  doc.restore();

  return doc;
}

module.exports = { buildFinancialPdf };