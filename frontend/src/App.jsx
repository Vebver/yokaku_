import './Style/App.css'
import Navbar from './components/Navbar.jsx'
import HeroSection from './components/HeroSection.jsx'
import FeaturedMenu from './components/FeaturedMenu.jsx'
import AboutSection from './components/AboutSection.jsx'
import PromoSection from './components/PromoSection.jsx'
import ReviewsSection from './components/ReviewsSection.jsx'
import Footer from './components/Footer.jsx'

function App() {
  return (
    <div id="app">
      <Navbar />
      <HeroSection />
      <FeaturedMenu />
      <AboutSection />
      <PromoSection />
      <ReviewsSection />
      <Footer />
    </div>
  )
}

export default App

