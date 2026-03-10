import '../Style/Footer.css'

function Footer() {
  return (
    <footer>
      <div className="footer-logo">
        <span className="logo-circle">H</span>
        <span className="logo-name">HANGOUT</span>
      </div>
      <div className="footer-columns" id="contact-section">
        <div>
          <h4>CONTACT US</h4>
          <p><strong>Facebook:</strong> Hangout Resto Marilao Bulacan</p>
          <p><strong>Email:</strong> abrevointernational@gmail.com</p>
          <p><strong>Phone:</strong> 0905 804 5458</p>
        </div>
        <div>
          <h4>ABOUT US</h4>
          <p><strong>Location:</strong> Purok 3, Ibayo, Marilao, Bulacan, 3019 (PS Bank RCH Building near 7-Eleven)</p>
          <p><strong>Open Daily:</strong> 10:00 AM - 11:00 PM</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

