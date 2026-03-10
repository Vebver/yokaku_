import '../Style/PromoSection.css'

function PromoSection() {
  const promos = [
    '/promo-1.jpg',
    '/promo-2.jpg',
    '/promo-3.jpg',
  ]

  return (
    <section className="promos">
      <h2>DON'T MISS OUR <span className="highlight">EXCLUSIVE PROMOS</span></h2>
      <div className="promo-images">
        {promos.map((promo, idx) => (
          <img key={idx} src={promo} alt={`Promo ${idx + 1}`} />
        ))}
      </div>
    </section>
  )
}

export default PromoSection

