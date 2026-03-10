import '../Style/AboutSection.css'

function AboutSection() {
  const aboutImages = [
    '/about-1.jpg',
    '/about-2.jpg',
    '/about-3.jpg',
  ]

  return (
    <section className="about-us">
      <h2>ABOUT US</h2>
      <div className="about-content">
        <div className="about-images">
          {aboutImages.map((img, idx) => (
            <img key={idx} src={img} alt={`About image ${idx + 1}`} />
          ))}
        </div>
        <div className="about-text">
          <h3>OUR RESTAURANT</h3>
          <p>
            Hangout Restobar was created to give people a place where they can relax,
            enjoy good food, and spend quality time with friends and family.
            What started as a simple idea to bring people together has grown into
            a welcoming spot known for its flavorful dishes and refreshing drinks.
            Today, Hangout Restobar continues to provide a fun and comfortable atmosphere
            where every visit feels like a great hangout.
          </p>
        </div>
      </div>
    </section>
  )
}

export default AboutSection

