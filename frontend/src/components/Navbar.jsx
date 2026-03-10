import '../Style/Navbar.css'

function Navbar() {
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT']

  const handleLogin = () => {
    alert('Login functionality coming soon!')
  }

  const handleSignup = () => {
    alert('Signup functionality coming soon!')
  }

  return (
    <header className="navbar">
      <div className="logo">HANGOUT</div>
      
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>  
              <a href="#">{item}</a>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="auth-buttons">
        <button className="login-btn" onClick={handleLogin}>LOGIN</button>
        <button className="signup-btn" onClick={handleSignup}>SIGNUP</button>
      </div>
    </header>
  )
}

export default Navbar

