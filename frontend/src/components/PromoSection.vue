<template>
  <section class="promos">
    <h2>DON'T MISS OUR <span class="highlight">EXCLUSIVE PROMOS</span></h2>
    <div class="promo-images">
      <img v-for="(promo, idx) in promos" :key="idx" :src="promo" :alt="`Promo ${idx + 1}`" />
    </div>
  </section>
</template>

<script>
export default {
  name: 'PromoSection',
  data() {
    return {
      promos: [
        '/images/promo-1.jpg',
        '/images/promo-2.jpg',
        '/images/promo-3.jpg',
      ],
    };
  },
};
</script>

<style scoped>
.promos {
  text-align: center;
  padding: 3rem 2rem;
  background-color: white;
}

.promos h2 {
  font-weight: 900;
  font-size: 1.8rem;
  margin-bottom: 2rem;
  letter-spacing: 0.05em;
  color: black;
}

.promos .highlight {
  color: #FFD400;
  text-shadow: 2px 2px 2px #a68300;
}

.promo-images {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.promo-images img {
  width: 280px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  cursor: pointer;
}

.promo-images img:hover {
  transform: scale(1.05);
}
</style>