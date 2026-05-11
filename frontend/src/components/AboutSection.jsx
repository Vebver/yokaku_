import { useState } from "react";
import "../Style/AboutSection.css";

function AboutSection({ onLoginClick }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <>
      <hr></hr>
      <div className="container">
        <div className="about-header">
          <span className="subtitle">OUR STORY</span>
          <h2>About Us</h2>
          <div className="accent-line"></div>
        </div>

        <div className="about-content">
          <div className="about-image-grid">
            <div className="img-large">
              <img
                src="/about-1.jpg"
                alt="Restaurant Interior"
                onClick={() => setSelectedImage("/about-1.jpg")}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="img-small-top">
              <img
                src="/about-2.jpg"
                alt="Ramen Dish"
                onClick={() => setSelectedImage("/about-2.jpg")}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="img-small-bottom">
              <img
                src="/about-3.jpg"
                alt="Food Prep"
                onClick={() => setSelectedImage("/about-3.jpg")}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          <div className="about-text">
            <div className="about-icon">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L15 8.5L22 9.5L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.5L9 8.5L12 2Z"
                  fill="#ffcc00"
                  stroke="#ffcc00"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <h3>Hangout Restobar</h3>
            <p className="main-para">
              Hangout Restobar was created to give people a place where they can
              relax, enjoy good food, and spend quality time with friends and
              family.
            </p>
            <p className="sub-para">
              What started as a simple idea to bring people together has grown
              into a welcoming spot known for its flavorful dishes and
              refreshing drinks. Today, Hangout Restobar continues to provide a
              fun and comfortable atmosphere where every visit feels like a
              great hangout.
            </p>
            <div className="about-features">
              <div className="feature-item">
                <span className="feature-icon">🍽️</span>
                <span>Quality Food</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🍸</span>
                <span>Refreshing Drinks</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎵</span>
                <span>Great Atmosphere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default AboutSection;
