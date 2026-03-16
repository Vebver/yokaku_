import '../Style/HeroSection.css'

function HeroSection({ onReserveClick, onLoginClick }) {
  
const handleReserveTable = () => {
    const token = localStorage.getItem("token");

    if (token) {
      // User is logged in, show the Reservation modal
      onReserveClick();
    } else {
      // User is NOT logged in, show the Login modal
      onLoginClick();
    }
  };

  return (
    <section className="hero position-relative">
      <div className="hero-image-container">
        <img src="/hero.jpg" alt="Delicious Wings" className="hero-img" />
      </div>
      <div className="hero-overlay position-absolute top-0 start-0 w-100 h-100"></div>
      <div className="hero-content position-relative z-2 container">
        <div className="hero-text">
          <h1><span className="highlight">HANGOUT</span><br /><span className="text-white">RESTOBAR</span></h1>
          <p>
            The perfect place to relax and enjoy great food with friends and family.
            We offer delicious meals, refreshing drinks and vibrant atmosphere.
          </p>
          <button className="reserve-btn" onClick={handleReserveTable}>RESERVE A TABLE</button>
        </div>
      </div>
    </section>
  )
}

export default HeroSection;

