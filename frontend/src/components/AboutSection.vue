<template>
  <section class="about-us">
    <h2>ABOUT US</h2>
    <div class="about-content">
      <div class="about-images">
        <img v-for="(img, idx) in aboutImages" :key="idx" :src="img" :alt="`About image ${idx + 1}`" />
      </div>
      <div class="about-text">
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
</template>

<script>
export default {
  name: 'AboutSection',
  data() {
    return {
      aboutImages: [
        '/images/about-1.jpg',
        '/images/about-2.jpg',
        '/images/about-3.jpg',
      ],
    };
  },
};
</script>

<style scoped>
.about-us {
  background-color: #fff7cc;
  padding: 3rem 2rem;
}

.about-us h2 {
  font-weight: 700;
  font-size: 2rem;
  margin-bottom: 2rem;
}

.about-content {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.about-images {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 320px;
  flex: 1 1 300px;
}

.about-images img {
  border-radius: 12px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  object-fit: cover;
  width: 100%;
  max-height: 180px;
}

.about-text {
  flex: 1 1 400px;
  max-width: 600px;
}

.about-text h3 {
  margin-bottom: 1rem;
  font-weight: 700;
}

.about-text p {
  font-weight: 400;
  font-size: 1.05rem;
  color: #5a4e2a;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .about-content {
    flex-direction: column;
  }
}
</style>