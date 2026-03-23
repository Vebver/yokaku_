// components/ReservationSuccess.jsx
const ReservationSuccess = ({ onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center',
    alignItems: 'center', zIndex: 99999 // EXTREMELY HIGH
  }}>
     <div className="success-card" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '15px', textAlign: 'center' }}>
       <h2>⌛ PENDING APPROVAL</h2>
       <p>Successfully submitted. Check your email for updates.</p>
       <button onClick={onClose} className="res-btn-continue">OKAY</button>
     </div>
  </div>
);

export default ReservationSuccess;