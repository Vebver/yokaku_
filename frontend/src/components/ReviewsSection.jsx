import React, { useState, useEffect } from "react";
import axios from "axios";
import Slider from "react-slick"; 
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import '../Style/ReviewsSection.css';

function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchReviews();
    checkEligibility();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/reviews");
      setReviews(res.data);
    } catch (err) { console.error(err); }
  };

  const checkEligibility = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5000/api/reviews/eligibility", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCanReview(res.data.canReview);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post("http://localhost:5000/api/reviews", { rating, comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Feedback submitted!");
      setComment("");
      setShowForm(false);
      fetchReviews();
    } catch (err) { alert("Error submitting feedback"); }
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
    arrows: true
  };

  return (
    <section className="reviews" id="feedbacks-section">
      <h2>REVIEWS</h2>
      <h3>WHAT OUR CUSTOMERS HAVE TO SAY...</h3>

      {canReview && !showForm && (
        <button className="write-review-btn" onClick={() => setShowForm(true)}>
          WRITE A REVIEW
        </button>
      )}

      {showForm && (
        <div className="review-input-container fade-in">
          <form onSubmit={handleSubmit}>
            <div className="star-rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} 
                  className={`star-clickable ${rating >= star ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                >&#9733;</span>
              ))}
            </div>
            <textarea 
              placeholder="How was your experience at Hangout?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
            <div className="form-actions">
              <button type="submit" className="rev-submit-btn">Post Feedback</button>
              <button type="button" className="rev-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
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
                    {review.first_name[0]}{review.last_name[0]}
                  </div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                      <span key={starIndex} className={`star ${starIndex <= review.rating ? 'filled' : ''}`}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <p className="review-text">"{review.comment}"</p>
                  <p className="review-author">{review.first_name} {review.last_name}</p>
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