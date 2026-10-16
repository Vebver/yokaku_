import { useEffect, useState } from "react";
import api, { resolveAssetUrl } from "../api";
import "../Style/PromoSection.css";

function PromoSection() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  const promos = ["/promo-1.jpg", "/promo-2.jpg", "/promo-3.jpg"];

  useEffect(() => {
    api.get("/announcements")
      .then((response) => setAnnouncements(response.data))
      .catch(() => setAnnouncements([]));
  }, []);

  return (
    <>
      <hr></hr>
      <section className="promos" id="promos-section">
        <h2>
          DON'T MISS OUR <span className="highlight">EXCLUSIVE OFFERS</span>
        </h2>
        {announcements.length > 0 && (
          <div className="announcement-list" aria-label="Latest Hangout announcements">
            {announcements.map((announcement) => {
              const image = announcement.local_path || announcement.image_url;
              return (
                <article className="announcement-item" key={announcement.announcement_id}>
                  {image && (
                    <img
                      className="announcement-image"
                      src={resolveAssetUrl(image)}
                      alt=""
                    />
                  )}
                  <div className="announcement-copy">
                    <span className="announcement-type">
                      {announcement.announcement_type === "menu"
                        ? "New menu"
                        : announcement.announcement_type === "event"
                          ? "Event"
                          : announcement.announcement_type === "promo"
                            ? "Promotion"
                            : "Hangout update"}
                    </span>
                    <h3>{announcement.title}</h3>
                    <p>{announcement.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="promo-images">
          {promos.map((promo, idx) => (
            <img
              key={idx}
              src={promo}
              alt={`Promo ${idx + 1}`}
              onClick={() => setSelectedImage(promo)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      </section>

      {/* Modal Lightbox */}
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
