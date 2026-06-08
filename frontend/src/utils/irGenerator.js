// src/utils/irGenerator.js

export const generateIncidentReportPDF = (res) => {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Incident_Report_${res.reservation_id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px solid #ffc107; padding-bottom: 15px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #212529; font-size: 26px; letter-spacing: 1px; }
          .header p { margin: 5px 0 0 0; color: #6c757d; font-size: 14px; font-weight: 600; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; color: #495057; background: #f8f9fa; padding: 10px 15px; border-radius: 6px; }
          .section { margin-bottom: 25px; }
          .section h3 { border-bottom: 2px solid #dee2e6; padding-bottom: 6px; margin-bottom: 15px; color: #212529; font-size: 16px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .field { font-size: 13.5px; }
          .field strong { color: #495057; }
          .box { border: 1px solid #ced4da; height: 160px; margin-top: 15px; border-radius: 6px; background-color: #fcfcfc; }
          .sign-off { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature { border-top: 1px dashed #6c757d; width: 220px; text-align: center; padding-top: 8px; font-size: 13px; color: #495057; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INCIDENT REPORT (IR)</h1>
          <p>Hangout Restaurant Booking System</p>
        </div>
        
        <div class="meta-info">
          <span><strong>FILE ID:</strong> IR-${res.reservation_id}</span>
          <span><strong>DATE FILED:</strong> ${new Date().toLocaleDateString()}</span>
        </div>

        <div class="section">
          <h3>Customer Details</h3>
          <div class="grid">
            <div class="field"><strong>Customer Name:</strong> ${res.first_name} ${res.last_name}</div>
            <div class="field"><strong>Email:</strong> ${res.email || "N/A"}</div>
            <div class="field"><strong>Phone:</strong> ${res.phone_number || res.phone || "No Phone Provided"}</div>
          </div>
        </div>

        <div class="section">
          <h3>Reservation Details</h3>
          <div class="grid">
            <div class="field"><strong>Reservation ID:</strong> ${res.reservation_id}</div>
            <div class="field"><strong>Booking Date:</strong> ${new Date(res.reservation_date).toLocaleDateString()}</div>
            <div class="field"><strong>Schedule Slot:</strong> ${res.reservation_time} - ${res.end_time || "N/A"}</div>
            <div class="field"><strong>Assigned Tables:</strong> ${res.assigned_tables || "N/A"}</div>
          </div>
        </div>

        <div class="section">
          <h3>Incident Description & Notes</h3>
          <p style="font-size: 12.5px; color: #6c757d; margin: 0;">Specify details of the incident below:</p>
          <div class="box"></div>
        </div>

        <div class="sign-off">
          <div class="signature">Admin Signature</div>
          <div class="signature">Date Signed</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};