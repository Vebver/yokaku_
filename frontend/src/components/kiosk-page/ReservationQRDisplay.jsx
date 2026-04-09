import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';

const ReservationQRDisplay = ({ reservationId }) => {
  
  // Function to download the QR code as an image (optional)
  const downloadQRCode = () => {
    const svg = document.getElementById("reservation-qr");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white"; // Important for scanners
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${reservationId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px', background: 'white', borderRadius: '20px', width: 'fit-content' }}>
      <h3 style={{ color: 'black', margin: 0 }}>Scan at Kiosk</h3>
      
      {/* This is the part that converts the ID into a QR Code */}
      <QRCodeSVG 
        id="reservation-qr"
        value={reservationId} // Your ID (e.g. "RES-12345") goes here
        size={200}
        level={"H"} // High error correction for fast scanning
        includeMargin={true}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={downloadQRCode} style={btnStyle}>
          <Download size={18} /> Save Image
        </button>
        <button onClick={() => window.print()} style={btnStyle}>
          <Printer size={18} /> Print
        </button>
      </div>
      
      <span style={{ color: '#666', fontWeight: 'bold' }}>{reservationId}</span>
    </div>
  );
};

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '10px 15px',
  border: '1px solid #ddd',
  borderRadius: '10px',
  background: '#f8f9fa',
  cursor: 'pointer',
  fontSize: '0.8rem'
};

export default ReservationQRDisplay;