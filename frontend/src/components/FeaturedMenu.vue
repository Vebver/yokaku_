<template>
  <section class="featured-menu">
    <h2>FEATURED MENU</h2>
    <div class="menu-items">
      <div v-for="(menu, index) in menus" :key="index" class="menu-card">
        <img :src="menu.img" :alt="menu.title" />
        <span>{{ menu.title }}</span>
      </div>
    </div>
    <button class="all-menu-btn" @click="handleAllMenu">
      ALL AVAILABLE MENU
    </button>
  </section>
</template>

<script>
export default {
  name: 'FeaturedMenu',
  data() {
    return {
      menus: [
        { title: 'UNLIMITED WINGS & MORE', img: '/images/wings.jpg' },
        { title: 'PIZZA & PIZZA BURGERS', img: '/images/pizza.jpg' },
        { title: 'RAMEN SETS', img: '/images/ramen.jpg' },
      ],
    };
  },
  methods: {
    handleAllMenu() {
      alert('Show all menu functionality coming soon!');
    },
  },
};
</script>

<style scoped>
.featured-menu {
  padding: 3rem 2rem;
  text-align: center;
}

.featured-menu h2 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  letter-spacing: 1.2px;
}

.menu-items {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1.8rem;
}

.menu-card {
  background-color: #ffd400;
  border-radius: 15px;
  width: 220px;
  padding: 1rem;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.menu-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.15);
}

.menu-card img {
  width: 180px;
  height: 140px;
  border-radius: 15px;
  object-fit: cover;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
}

.menu-card span {
  font-weight: 700;
  font-size: 1rem;
  color: #1c1c1c;
  text-align: center;
  line-height: 1.1;
}

.all-menu-btn {
  padding: 0.6rem 1.6rem;
  border-radius: 30px;
  border: 2px solid #000;
  cursor: pointer;
  font-weight: 600;
  background: transparent;
  transition: background 0.3s, color 0.3s;
}

.all-menu-btn:hover {
  background: #000;
  color: #fff;
}
</style>