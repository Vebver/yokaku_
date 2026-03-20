import '../Style/ReviewsSection.css'

function ReviewsSection() {
  const reviews = [
    {
      rating: 3,
      text: '200 g watowiny bigdrais kriszlat loran isum ipsum asata lcias sodzone boczek rukola cebulka priona sos serowy butta saqam czamuzhka.',
      author: 'ANFERNEE CRUZ',
    },
    {
      rating: 3,
      text: '200 g watowiny bigdrais kriszlat loran isum ipsum asata lcias sodzone boczek rukola cebulka priona sos serowy butta saqam czamuzhka.',
      author: 'ANFERNEE CRUZ',
    },
    {
      rating: 3,
      text: '200 g watowiny bigdrais kriszlat loran isum ipsum asata lcias sodzone boczek rukola cebulka priona sos serowy butta saqam czamuzhka.',
      author: 'ANFERNEE CRUZ',
    },
  ]

  const handleFeedback = () => {
    const token = localStorage.getItem("token");

    if (token) {
      // User is logged in, show the Reservation modal
      onFeedbackClick();
    } else {
      // User is NOT logged in, show the Login modal
      onLoginClick();
    }
  };

  return (
    <section className="reviews" id="feedbacks-section">
      <h2>REVIEWS</h2>
      <h3>WHAT OUR CUSTOMERS HAVE TO SAY...</h3>
      <div className="review-cards">
        {reviews.map((review, idx) => (
          <div key={idx} className="review-card">
            <div className="avatar"></div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((starIndex) => (
                <span key={starIndex} className={`star ${starIndex <= review.rating ? 'filled' : ''}`}>
                  &#9733;
                </span>
              ))}
            </div>
            <p className="review-text">{review.text}</p>
            <p className="review-author">{review.author}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ReviewsSection

