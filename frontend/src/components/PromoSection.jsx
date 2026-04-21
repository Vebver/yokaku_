import { useState } from 'react'
import '../Style/PromoSection.css'

function PromoSection() {
  const [selectedImage, setSelectedImage] = useState(null)

  const promos = [
    '/promo-1.jpg',
    '/promo-2.jpg',
    '/promo-3.jpg',
  ]

  return (
    <>
      <section className="promos" id="promos-section">
        <h2>DON'T MISS OUR <span className="highlight">EXCLUSIVE PROMOS</span></h2>
        <div className="promo-images">
          {promos.map((promo, idx) => (
            <img 
              key={idx} 
              src={promo} 
              alt={`Promo ${idx + 1}`}
              onClick={() => setSelectedImage(promo)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </section>

      {/* Modal Lightbox */}
      {selectedImage && (
        <div 
          className="modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div className="modal-content">
            <img src={selectedImage} alt="Full view" />
            <button 
              className="modal-close"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default PromoSection

