import '../Style/Navbar.css';

// We remove useNavigate because we aren't going to a new page anymore
function Navbar({ onLoginClick }) { 
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'];

  return (
    <header className="navbar">
      {/* If you want the logo to just scroll to top, use href="#" */}
      <div className="logo">
        <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>HANGOUT</a>
      </div>
      
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => {
            let path = "#"; 
            if (item === "ABOUT") path = "#about-section";
            if (item === "PROMOS") path = "#promos-section";
            if (item === "CONTACT") path = "#contact-section";
            if (item === "MENU") path = "#menu-section";
            
            return (
              <li key={index}>
                <a href={path}>{item}</a>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="auth-buttons">
        {/* This triggers the state change in App.jsx */}
        <button className="login-btn" onClick={onLoginClick}>LOGIN</button>
      </div>
    </header>
  );
}

export default Navbar;