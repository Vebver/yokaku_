<template>
  <section class="hero">
    <div class="hero-overlay"></div>
    <div class="hero-text">
      <h1><span class="highlight">HANGOUT</span><br />RESTOBAR</h1>
      <p>
        The perfect place to relax and enjoy great food with friends and family.
        We offer delicious meals, refreshing drinks and vibrant atmosphere.
      </p>
      <button class="reserve-btn" @click="handleReserve">RESERVE A TABLE</button>
    </div>
    <div class="hero-image">
      <img src="/images/hero.jpg" alt="Delicious Wings" />
    </div>
  </section>
</template>

<script>
export default {
  name: 'HeroSection',
  methods: {
    handleReserve() {
      alert('Reservation functionality coming soon!');
    },
  },
};
</script>

<style scoped>
.hero {
  background-image: url('/images/hero-background.jpg');
  background-position: center;
  background-size: cover;
  padding: 6rem 2rem 4rem;
  color: white;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 20px 20px;
  position: relative;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  border-radius: 0 0 20px 20px;
  z-index: 0;
}

.hero-text {
  flex: 1 1 320px;
  max-width: 600px;
  z-index: 1;
}

.hero-text h1 {
  font-weight: 900;
  font-size: 3.5rem;
  margin-bottom: 1rem;
  line-height: 1;
}

.highlight {
  color: #FFD400;
}

.hero-text p {
  font-weight: 400;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  max-width: 480px;
}

.reserve-btn {
  padding: 0.8rem 2.4rem;
  border-radius: 30px;
  background-color: white;
  color: black;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: background-color 0.3s ease;
}

.reserve-btn:hover {
  background-color: #f2f2f2;
}

.hero-image {
  flex: 1 1 320px;
  max-width: 450px;
  z-index: 1;
  display: flex;
  justify-content: center;
}

.hero-image img {
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    padding: 4rem 1rem 3rem;
    text-align: center;
  }

  .hero-text,
  .hero-image {
    max-width: 100%;
  }
}
</style>