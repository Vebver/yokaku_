import '../Style/FeaturedMenu.css'

function FeaturedMenu() {
  const menus = [
    { title: 'UNLIMITED WINGS & MORE', img: '/wings.jpg' },
    { title: 'PIZZA & PIZZA BURGERS', img: '/pizza.jpg' },
    { title: 'RAMEN SETS', img: '/ramen.jpg' },
  ]

  const handleAllMenu = () => {
    alert('Show all menu functionality coming soon!')
  }

  return (
    <section className="featured-menu">
      <h2>FEATURED MENU</h2>
      <div className="menu-items">
        {menus.map((menu, index) => (
          <div key={index} className="menu-card">
            <img src={menu.img} alt={menu.title} />
            <span>{menu.title}</span>
          </div>
        ))}
      </div>
      <button className="all-menu-btn" onClick={handleAllMenu}>
        ALL AVAILABLE MENU
      </button>
    </section>
  )
}

export default FeaturedMenu

