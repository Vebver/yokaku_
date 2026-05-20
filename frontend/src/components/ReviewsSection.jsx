import React, { useState, useEffect } from "react";
import axios from "axios";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../Style/ReviewsSection.css";

const API_BASE = "https://yokaku-backend.onrender.com/api";

function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchReviews();
    checkEligibility();

    // Re-check eligibility when page becomes visible (e.g., after logging in or completing reservation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkEligibility();
      }
    };

    // Also listen for storage changes (token updates)
    const handleStorageChange = () => {
      checkEligibility();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkEligibility = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setCanReview(false);
      return;
    }
    setIsLoggedIn(true);
    try {
      const res = await axios.get(`${API_BASE}/reviews/eligibility`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCanReview(res.data.canReview);
    } catch (err) {
      console.error(err);
      setCanReview(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE}/reviews`,
        { rating, comment },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert("Feedback submitted!");
      setComment("");
      setShowForm(false);
      fetchReviews();
      checkEligibility(); // Re-check eligibility after submission
    } catch (err) {
      alert("Error submitting feedback");
    }
  };

  const settings = {
    dots: true,
    infinite: reviews.length > 1,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    arrows: true,
  };

  return (
    <section className="reviews" id="feedbacks-section">
      <hr></hr>
      <h2>REVIEWS</h2>
      <h3>WHAT OUR CUSTOMERS HAVE TO SAY...</h3>

      {canReview && !showForm && (
        <button className="write-review-btn" onClick={() => setShowForm(true)}>
          WRITE A REVIEW
        </button>
      )}

      {isLoggedIn && !canReview && !showForm && (
        <p style={{ color: "#ffcc00", fontSize: "0.9rem", margin: "15px 0" }}>
          ✓ Complete a reservation or dine with us to unlock the review feature
        </p>
      )}

      {showForm && (
        <div className="review-input-container fade-in">
          <form onSubmit={handleSubmit}>
            <div className="star-rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star-clickable ${rating >= star ? "filled" : ""}`}
                  onClick={() => setRating(star)}
                >
                  &#9733;
                </span>
              ))}
            </div>
            <textarea
              placeholder="How was your experience at Hangout?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
            <div className="form-actions">
              <button type="submit" className="rev-submit-btn">
                Post Feedback
              </button>
              <button
                type="button"
                className="rev-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- UNIQUE CLASS TO PREVENT FEATURED MENU OVERWRITE --- */}
      <div className="reviews-slick-container">
        {reviews.length > 0 ? (
          <Slider {...settings}>
            {reviews.map((review, idx) => (
              <div key={idx} className="review-slide-wrapper">
                <div className="review-card">
                  <div className="review-avatar">
                    {review.first_name[0]}
                    {review.last_name[0]}
                  </div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                      <span
                        key={starIndex}
                        className={`star ${starIndex <= review.rating ? "filled" : ""}`}
                      >
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <p className="review-text">"{review.comment}"</p>
                  <p className="review-author">
                    {review.first_name} {review.last_name}
                  </p>
                </div>
              </div>
            ))}
          </Slider>
        ) : (
          <p>No reviews yet. Be the first!</p>
        )}
      </div>
    </section>
  );
}

export default ReviewsSection;
