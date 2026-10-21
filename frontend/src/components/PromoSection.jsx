import { useState, useEffect } from "react";
import api from "../api";
import "../Style/PromoSection.css";

function PromoSection() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data.exclusive_offers) {
          setPromos(res.data.exclusive_offers);
        }
      } catch (err) {
        console.error("Failed to load promos", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  return (
    <>
      <hr />
      <section className="promos" id="promos-section">
        <h2>
          DON'T MISS OUR <span className="highlight">EXCLUSIVE OFFERS</span>
        </h2>
        <div className="promo-images">
          {loading ? (
            <div className="text-center py-4">Loading offers...</div>
          ) : promos.length > 0 ? (
            promos.map((promo) => (
              <img
                key={promo.id}
                src={promo.url}
                alt="Promo"
                onClick={() => setSelectedImage(promo.url)}
                style={{ cursor: "pointer" }}
                onError={(e) => {
                  // Prevent broken image placeholders
                  e.target.style.display = "none";
                }}
              />
            ))
          ) : (
            <div className="text-center text-muted py-4 w-100">
              No active offers at the moment.
            </div>
          )}
        </div>
      </section>

      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
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
  );
}

export default PromoSection;
