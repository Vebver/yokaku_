function AdminNavbar() {
  return (
    <header className="navbar" style={{ 
      padding: '1rem 2rem', 
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="logo" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
        <a href="/admin" style={{ textDecoration: 'none', color: 'white' }}>HANGOUT</a>
      </div>
    </header>
  );
}

export default AdminNavbar;

