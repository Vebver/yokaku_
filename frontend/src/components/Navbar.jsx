import '../Style/Navbar.css'

function Navbar() {
  const navItems = ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT']

  const handleLogin = () => {
    alert('Login functionality coming soon!')
  }

  return (
    <header className="navbar">
      <div className="logo">HANGOUT</div>
      
      <nav className="nav-menu">
        <ul>
          {navItems.map((item, index) => {

            let path = "#"
            if (item === "ABOUT") path = "#about-section"
            if (item === "MENU") path = "#menu-section"
            if (item === "PROMOS") path = "#promos-section"
            if (item === "CONTACT") path = "#contact-section"
            return(
              <li key={index}>
                <a href={path}>{item}</a>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="auth-buttons">
        <button className="login-btn" onClick={handleLogin}>LOGIN</button>
      </div>
    </header>
  )
}

export default Navbar

