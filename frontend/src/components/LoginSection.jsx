// LoginModal.jsx
import '../Style/LoginModal.css';

// LoginSection.jsx
function LoginSection({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents the modal from closing when you click the white box */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <h2>LOGIN</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="Email" className="login-input" />
          <input type="password" placeholder="Password" className="login-input" />
          <button type="submit" className="submit-btn">SUBMIT</button>

          <p>Don't have an account? <a href="">Sign up</a></p>
        </form>
      </div>
    </div>
  );
}

export default LoginSection;