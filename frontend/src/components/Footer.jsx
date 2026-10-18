import { useEffect, useState } from "react";
import api from "../api";
import '../Style/Footer.css'

const DEFAULT_CONTACT =
  "Facebook: Hangout Resto Marilao Bulacan\nEmail: abrevointernational@gmail.com\nPhone: 0905 804 5458";
const DEFAULT_ABOUT =
  "Location: Purok 3, Ibayo, Marilao, Bulacan, 3019 (PS Bank RCH Building near 7-Eleven)\nOpen Daily: 10:00 AM - 11:00 PM";

// Footer content is managed by the Admin (Maintenance > Footer Management) and
// stored in the database. The API falls back to sensible defaults, so the
// footer always renders even on first load.
function Footer() {
  const [footer, setFooter] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/settings")
      .then((res) => {
        if (!cancelled) {
          setFooter({
            contact: res.data.footer_contact ?? DEFAULT_CONTACT,
            about: res.data.footer_about ?? DEFAULT_ABOUT,
          });
        }
      })
<<<<<<< Updated upstream
      .catch((err) => console.error("Footer settings fetch error:", err));
=======
      .catch((err) => {
        console.error("Footer settings fetch error:", err);
        if (!cancelled) {
          setFooter({
            contact: DEFAULT_CONTACT,
            about: DEFAULT_ABOUT,
          });
        }
      });
>>>>>>> Stashed changes
    return () => {
      cancelled = true;
    };
  }, []);

  const renderLines = (text) =>
    (text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        // Bold the "Label:" prefix when a line uses one (e.g. "Email: ...").
        const match = line.match(/^([^:]{1,20}):\s*(.+)$/);
        return match ? (
          <p key={i}>
            <strong>{match[1]}:</strong> {match[2]}
          </p>
        ) : (
          <p key={i}>{line}</p>
        );
      });

  return (
    <footer>
      <div className="footer-logo">
        <div className="brand-mark" aria-label="Hangout brand mark">H</div>
        <div className="footer-brand-copy">
          <span className="logo-name">HANGOUT</span>
          <span className="logo-sub">Resto Bar</span>
        </div>
      </div>
      <div className="footer-columns" id="contact-section">
        <div>
          <h4>CONTACT US</h4>
          {footer ? (
            renderLines(footer.contact)
          ) : (
            <p className="text-secondary">Loading…</p>
          )}
        </div>
        <div>
          <h4>ABOUT US</h4>
          {footer ? (
            renderLines(footer.about)
          ) : (
            <p className="text-secondary">Loading…</p>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer

