import '../Style/AboutSection.css'

function AboutSection({onLoginClick}) {
  return (
    <section className="about-us" id="about-section">
      <div className="container">
        <div className="about-header">
          <span className="subtitle">OUR STORY</span>
          <h2>About Us</h2>
          <div className="accent-line"></div>
        </div>

        <div className="about-content">
          <div className="about-image-grid">
            <div className="img-large">
              <img src="/about-1.jpg" alt="Restaurant Interior" />
            </div>
            <div className="img-small-top">
              <img src="/about-2.jpg" alt="Ramen Dish" />
            </div>
            <div className="img-small-bottom">
              <img src="/about-3.jpg" alt="Food Prep" />
            </div>
          </div>

          <div className="about-text">
            <h3>Hangout Restobar</h3>
            <p className="main-para">
              Hangout Restobar was created to give people a place where they can relax,
              enjoy good food, and spend quality time with friends and family.
            </p>
            <p className="sub-para">
              What started as a simple idea to bring people together has grown into
              a welcoming spot known for its flavorful dishes and refreshing drinks.
              Today, Hangout Restobar continues to provide a fun and comfortable atmosphere
              where every visit feels like a great hangout.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection