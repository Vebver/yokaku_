export const handlePrintReceipt = ({
  selectedPayment,
  orderLineItems,
  getItemPrice,
  calculateItemsSum,
  showToast,
}) => {
  if (!selectedPayment) return;

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    showToast("Allow pop-ups to print the receipt.");
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );

  // Helper to format time to 12-hour AM/PM format in Asia/Manila timezone
  const formatTime12Hour = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  const total = Number(selectedPayment.total_bill || calculateItemsSum());
  const paid = Number(selectedPayment.amount || 0);
  const remaining = Math.max(
    Number(selectedPayment.balance_due ?? total - paid),
    0,
  );
  const formatCurrency = (amount) =>
    Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const itemsMarkup = orderLineItems.length
    ? orderLineItems
        .map((item) => {
          const quantity = Number(item.quantity || 0);
          const amount = quantity * getItemPrice(item);
          const name = item.name || item.item_name || "Ordered Item";
          const customizations = item.customizations
            ? `<small>${escapeHtml(item.customizations)}</small>`
            : "";

          return `<tr>
            <td>${escapeHtml(name)}${customizations}</td>
            <td class="number">${quantity}</td>
            <td class="number">₱${formatCurrency(amount)}</td>
          </tr>`;
        })
        .join("")
    : '<tr><td colspan="3" class="empty">No order items</td></tr>';

  const guestName =
    [selectedPayment.first_name, selectedPayment.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Walk-in Guest";

  const receiptDate = selectedPayment.reservation_date
    ? new Date(selectedPayment.reservation_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  // --- NEW: Calculate Time Start and Time End ---
  const timeStart = selectedPayment.session_started_at
    ? formatTime12Hour(selectedPayment.session_started_at)
    : "N/A";

  const timeEnd = selectedPayment.session_ended_at
    ? formatTime12Hour(selectedPayment.session_ended_at)
    : "Ongoing";
  // ----------------------------------------------

  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>Hangout Payment Receipt</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 8mm; color: #111; font: 12px/1.4 Arial, sans-serif; }
          main { width: 100%; max-width: 78mm; margin: 0 auto; }
          header { text-align: center; padding-bottom: 12px; border-bottom: 1px dashed #777; }
          h1 { margin: 0 0 4px; font-size: 18px; }
          p { margin: 2px 0; }
          .meta { margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { padding: 5px 0; border-bottom: 1px solid #777; text-align: left; }
          td { padding: 7px 0; vertical-align: top; border-bottom: 1px dotted #bbb; }
          td small { display: block; color: #555; }
          .number { text-align: right; white-space: nowrap; padding-left: 6px; }
          .empty { text-align: center; }
          .total { display: flex; justify-content: space-between; padding: 10px 0; margin-top: 4px; border-top: 1px dashed #777; font-size: 16px; font-weight: 700; }
          .payment { padding-top: 8px; border-top: 1px dashed #777; }
          .payment p { display: flex; justify-content: space-between; }
          footer { margin-top: 18px; text-align: center; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>HANGOUT RESTO BAR</h1>
            <p>Purok 3, Ibayo, Marilao, Bulacan, 3019</p>
            <p>PS Bank RCH Building near 7-Eleven</p>
            <p><strong>PAYMENT RECEIPT</strong></p>
          </header>
          <section class="meta">
            <p><strong>Receipt ID:</strong> ${escapeHtml(selectedPayment.reservation_id)}</p>
            <p><strong>Date:</strong> ${escapeHtml(receiptDate)}</p>
            <p><strong>Guest:</strong> ${escapeHtml(guestName)}</p>
            
            <!-- ===== NEW: TIME START AND TIME END ===== -->
            <p><strong>Time Start:</strong> ${escapeHtml(timeStart)}</p>
            <p><strong>Time End:</strong> ${escapeHtml(timeEnd)}</p>
            <!-- ======================================== -->

          </section>
          <table>
            <thead><tr><th>Order</th><th class="number">Qty</th><th class="number">Amount</th></tr></thead>
            <tbody>${itemsMarkup}</tbody>
          </table>
          <div class="total"><span>Total</span><span>₱${formatCurrency(total)}</span></div>
          <footer>Thank you for dining with us.</footer>
        </main>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
