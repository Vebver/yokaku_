<template>
  <div id="app">
    <Navbar />
    <HeroSection />
    <FeaturedMenu />
    <AboutSection />
    <PromoSection />
    <ReviewsSection />
    <Footer />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import HeroSection from './components/HeroSection.vue';
import FeaturedMenu from './components/FeaturedMenu.vue';
import AboutSection from './components/AboutSection.vue';
import PromoSection from './components/PromoSection.vue';
import ReviewsSection from './components/ReviewsSection.vue';
import Footer from './components/Footer.vue';

export default {
  name: 'App',
  components: {
    Navbar,
    HeroSection,
    FeaturedMenu,
    AboutSection,
    PromoSection,
    ReviewsSection,
    Footer,
  },
};
</script>

<style>
/* Global Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fff;
  color: #222;
  line-height: 1.5;
}

/* Smooth Scrolling */
html {
  scroll-behavior: smooth;
}

/* Remove outline on focus for better UX */
button:focus,
a:focus {
  outline: none;
}

/* Image styling */
img {
  max-width: 100%;
  display: block;
}

/* Button global styles */
button {
  font-family: inherit;
}
</style>