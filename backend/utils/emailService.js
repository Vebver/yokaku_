// utils/emailService.js
const brevo = require("@getbrevo/brevo");

// Initialize Brevo client
const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Sender information
const sender = {
  email: process.env.BREVO_SENDER_EMAIL || "noreply@yourdomain.com",
  name: process.env.BREVO_SENDER_NAME || "Restaurant Management",
};

// Function to send refund notification to store
const sendRefundNotificationEmail = async (refundData) => {
  const {
    reservationId,
    subject,
    comment,
    email: userEmail,
    reason,
    reservationType,
    userName,
  } = refundData;

  const storeEmail = "leabrescarl@gmail.com";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f38d31; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #f38d31; }
        .label { font-weight: bold; color: #555; display: block; margin-bottom: 5px; }
        .value { color: #333; }
        .status-badge { display: inline-block; background: #ffc107; color: #333; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
        .footer { text-align: center; padding: 15px; color: #888; font-size: 12px; border-top: 1px solid #ddd; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔄 New Refund Request</h2>
        </div>
        <div class="content">
          <p style="font-size: 16px; color: #666;">A new refund request has been submitted by a customer.</p>
          
          <div class="field">
            <span class="label">📋 Reservation ID:</span>
            <span class="value">${reservationId}</span>
          </div>
          
          <div class="field">
            <span class="label">👤 Customer Name:</span>
            <span class="value">${userName || "N/A"}</span>
          </div>
          
          <div class="field">
            <span class="label">📧 Customer Email:</span>
            <span class="value">${userEmail}</span>
          </div>
          
          <div class="field">
            <span class="label">🏷️ Reservation Type:</span>
            <span class="value">${reservationType || "N/A"}</span>
          </div>
          
          <div class="field">
            <span class="label">📝 Reason for Refund:</span>
            <span class="value">${reason || "N/A"}</span>
          </div>
          
          <div class="field">
            <span class="label">📌 Subject:</span>
            <span class="value">${subject}</span>
          </div>
          
          <div class="field">
            <span class="label">💬 Comment/Details:</span>
            <span class="value">${comment}</span>
          </div>
          
          <div class="field">
            <span class="label">📊 Status:</span>
            <span class="status-badge">Pending Review</span>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              ⚠️ This refund request requires your review and action.
            </p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Restaurant Management System.</p>
          <p>Please review this refund request at your earliest convenience.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `🔔 New Refund Request - ${reservationId}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: storeEmail }];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Refund notification email sent to store:", response);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("❌ Error sending refund notification email:", error);
    return { success: false, error: error.message };
  }
};

// Function to send confirmation to customer
const sendRefundConfirmationEmail = async (refundData) => {
  const {
    reservationId,
    subject,
    comment,
    email: userEmail,
    reason,
    reservationType,
    userName,
  } = refundData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; }
        .label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 15px; color: #888; font-size: 12px; border-top: 1px solid #ddd; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Refund Request Received</h2>
        </div>
        <div class="content">
          <p>Dear ${userName || "Customer"},</p>
          <p>We have received your refund request for <strong>Reservation #${reservationId}</strong>.</p>
          
          <p><strong>Request Details:</strong></p>
          <div class="field">
            <span class="label">📌 Subject:</span> ${subject}
          </div>
          <div class="field">
            <span class="label">💬 Your Comment:</span> ${comment}
          </div>
          <div class="field">
            <span class="label">📊 Status:</span> <span style="color: #ffc107; font-weight: bold;">Pending Review</span>
          </div>
          
          <p style="margin-top: 20px;">We will review your request and get back to you within 24-48 hours.</p>
          
          <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
            <p style="margin: 0; color: #004085;">
              💡 You can check the status of your refund request in your account dashboard.
            </p>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for choosing our restaurant!</p>
          <p>This is an automated confirmation. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `📧 Refund Request Received - ${reservationId}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: userEmail }];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Confirmation email sent to customer:", response);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendRefundNotificationEmail,
  sendRefundConfirmationEmail,
};
