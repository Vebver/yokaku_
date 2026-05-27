const PDFDocument = require('pdfkit');

function formatCurrencyPHP(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function drawKeyValue(doc, x, y, label, value, options = {}) {
  const { valueColor = '#111827' } = options;

  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text(label, x, y);

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(valueColor)
    .text(String(value), x, y + 14);
}

function buildFinancialPdf({ title, payload }) {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const today = new Date();
  const dateLabel = today.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text(title, { align: 'left' });
  doc
    .moveDown(0.2)
    .fontSize(10)
    .fillColor('#6b7280')
    .text(`Generated: ${dateLabel}`);

  doc.moveDown(1.2);

  // Summary cards row
  const summary = payload?.summary || {};
  const profitWeekly = payload?.profit?.weekly || 0;
  const profitMonthly = payload?.profit?.monthly || 0;
  const profitYearly = payload?.profit?.yearly || 0;

  const baseY = doc.y;
  const colGap = 170;

  drawKeyValue(doc, doc.page.margins.left, baseY, 'Profit (Weekly)', formatCurrencyPHP(profitWeekly), {
    valueColor: '#059669',
  });
  drawKeyValue(doc, doc.page.margins.left + colGap, baseY, 'Profit (Monthly)', formatCurrencyPHP(profitMonthly), {
    valueColor: '#059669',
  });
  drawKeyValue(doc, doc.page.margins.left + colGap * 2, baseY, 'Profit (Yearly)', formatCurrencyPHP(profitYearly), {
    valueColor: '#059669',
  });

  // Small totals
  doc
    .moveDown(1.2)
    .fontSize(10)
    .fillColor('#374151')
    .text(`Orders Total: ${summary.total_orders ?? 0}`);

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor('#374151')
    .text(`Average Order Value (AOV): ${formatCurrencyPHP(summary.aov ?? 0)}`);

  doc.moveDown(1.0);

  // Helper to draw trend table
  function drawTrendTable(sectionTitle, trendRows) {
    doc
      .moveDown(0.2)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text(sectionTitle);

    doc.moveDown(0.4);

    const rows = Array.isArray(trendRows) ? trendRows : [];

    const startX = doc.page.margins.left;
    const startY = doc.y;
    const col1W = 180;
    const col2W = doc.page.width - doc.page.margins.left - doc.page.margins.right - col1W;

    // Header
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Period', startX, startY);
    doc.text('Revenue / Profit', startX + col1W, startY, { width: col2W, align: 'right' });

    // Underline
    doc
      .moveTo(startX, startY + 14)
      .lineTo(startX + col1W + col2W, startY + 14)
      .strokeColor('#e5e7eb')
      .stroke();

    let y = startY + 18;
    const rowH = 16;

    if (rows.length === 0) {
      doc
        .fillColor('#6b7280')
        .fontSize(10)
        .text('No data available.', startX, y);
      doc.moveDown(1);
      return;
    }

    for (const r of rows) {
      const label = r.label ?? r.period ?? r.month ?? r.week ?? r.date ?? '';
      const value = formatCurrencyPHP(r.value ?? r.revenue ?? 0);

      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(10)
        .text(String(label), startX, y);

      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(String(value), startX + col1W, y, { width: col2W, align: 'right' });

      y += rowH;

      // New page if needed
      if (y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    doc.moveDown(0.6);
  }

  drawTrendTable('Revenue Trend (Weekly)', payload?.trends?.weekly);
  drawTrendTable('Revenue Trend (Monthly)', payload?.trends?.monthly);
  drawTrendTable('Revenue Trend (Yearly)', payload?.trends?.yearly);

  // Footnote
  doc.moveDown(0.8);
  doc
    .fontSize(9)
    .fillColor('#6b7280')
    .text(
      'Note: Profit is calculated as total revenue from verified payments and kiosk walk-in orders (no expense subtraction).',
    );

  return doc;
}

module.exports = { buildFinancialPdf };

