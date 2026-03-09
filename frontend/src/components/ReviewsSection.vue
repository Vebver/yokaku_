<template>
  <section class="reviews">
    <h2>REVIEWS</h2>
    <h3>WHAT OUR CUSTOMERS HAVE TO SAY...</h3>
    <div class="review-cards">
      <div v-for="(review, idx) in reviews" :key="idx" class="review-card">
        <div class="avatar"></div>
        <div class="stars">
          <span v-for="starIndex in 5" :key="starIndex" class="star" :class="{ filled: starIndex <= review.rating }">&#9733;</span>
        </div>
        <p class="review-text">{{ review.text }}</p>
        <p class="review-author">{{ review.author }}</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ReviewsSection',
  data() {
    return {
      reviews: [
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
      ],
    };
  },
};
</script>

<style scoped>
.reviews {
  padding: 3rem 2rem 4rem;
  text-align: center;
  background-color: white;
}

.reviews h2 {
  font-weight: 900;
  font-size: 1.7rem;
  margin-bottom: 0.2rem;
}

.reviews h3 {
  font-weight: 700;
  font-size: 1.3rem;
  margin-bottom: 2rem;
  color: #FFD400;
  text-shadow: 2px 2px 3px #a68300;
}

.review-cards {
  display: flex;
  justify-content: center;
  gap: 1.8rem;
  flex-wrap: wrap;
}

.review-card {
  background-color: white;
  border-radius: 15px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  width: 280px;
  padding: 1.6rem;
  text-align: center;
  min-height: 270px;
  position: relative;
  cursor: default;
}

.avatar {
  width: 60px;
  height: 60px;
  background-color: #bbb;
  border-radius: 50%;
  margin: 0 auto 1rem;
}

.stars {
  margin-bottom: 15px;
}

.star {
  font-size: 1.2rem;
  margin: 0 3px;
  color: #ccc;
}

.star.filled {
  color: #FFD400;
}

.review-text {
  font-weight: 400;
  font-size: 0.9rem;
  color: #555;
  min-height: 90px;
  margin-bottom: 1rem;
}

.review-author {
  font-weight: 700;
  font-size: 0.9rem;
  color: #222;
  border-top: 1.5px solid #eee;
  padding-top: 0.6rem;
  letter-spacing: 0.04em;
}

@media (max-width: 900px) {
  .review-cards {
    flex-direction: column;
    align-items: center;
  }
}
</style>