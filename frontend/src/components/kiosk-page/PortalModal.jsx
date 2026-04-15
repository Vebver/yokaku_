import React from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle } from 'lucide-react';

const PortalModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', // Fixed from 100vw
      background: 'rgba(0, 0, 0, 0.95)', 
      zIndex: 9999999, 
      display: 'flex',
      justifyContent: 'center', 
      alignItems: 'center',
      pointerEvents: 'auto'
    }}>
      <div style={{
        background: '#1a1a1a', 
        padding: '50px', 
        borderRadius: '30px', 
        textAlign: 'center', 
        border: '3px solid #ffcc00', 
        width: '450px',
        boxShadow: '0 0 30px rgba(255, 204, 0, 0.2)'
      }}>
        <CheckCircle size={60} color="#ffcc00" style={{ marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
        <h2 style={{ color: '#ffcc00', fontSize: '2rem', marginBottom: '10px' }}>Finish Session?</h2>
        <p style={{ color: 'white', margin: '20px 0', fontSize: '1.1rem' }}>This will end your reservation and clear the session.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button 
            onPointerDown={onConfirm} 
            style={{ background: '#ffcc00', padding: '20px', borderRadius: '15px', border: 'none', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', color: 'black' }}
          >
            YES, I'M FINISHED
          </button>
          <button 
            onPointerDown={onClose} 
            style={{ background: 'transparent', color: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #555', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            NO, GO BACK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PortalModal;