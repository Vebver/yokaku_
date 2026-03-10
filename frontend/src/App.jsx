import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturedMenu from './components/FeaturedMenu';
import AboutSection from './components/AboutSection';
import PromoSection from './components/PromoSection';
import ReviewsSection from './components/ReviewsSection';
import Footer from './components/Footer';
import LoginSection from './components/LoginSection'; 

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <Router>
      <div id="app">
        {/* Pass the function to the Navbar */}
        <Navbar onLoginClick={() => setIsLoginOpen(true)} />

        <Routes>
          <Route path="/" element={
            <>
              <HeroSection />
              <div id="menu-section"><FeaturedMenu /></div>
              <div id="about-section"><AboutSection /></div>
              <div id="promos-section"><PromoSection /></div>
              <ReviewsSection />
              {/* Footer moved inside the route content to keep it at the bottom */}
              <Footer />
            </>
          } />
          
          {/* Even though we use a modal, keeping this empty route 
            prevents errors if someone manually types /login 
          */}
          <Route path="/login" element={<div />} />
        </Routes>

        {/* MODAL LAYER: Renders on top of everything */}
        {isLoginOpen && (
          <LoginSection onClose={() => setIsLoginOpen(false)} />
        )}
      </div>
    </Router>
  );
}

export default App;