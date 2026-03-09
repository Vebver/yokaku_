<template>
  <header class="navbar">
    <div class="logo">YOYAKU</div>
    
    <nav class="nav-menu">
      <ul>
        <li v-for="item in navItems" :key="item">
          <a href="#">{{ item }}</a>
        </li>
      </ul>
    </nav>
    
    <div class="auth-buttons">
      <button class="login-btn" @click="handleLogin">LOGIN</button>
      <button class="signup-btn" @click="handleSignup">SIGNUP</button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Navbar',
  data() {
    return {
      navItems: ['HOME', 'MENU', 'ABOUT', 'PROMOS', 'FEEDBACKS', 'CONTACT'],
    };
  },
  methods: {
    handleLogin() {
      alert('Login functionality coming soon!');
    },
    handleSignup() {
      alert('Signup functionality coming soon!');
    },
  },
};
</script>

<style scoped>
/* Navbar Container */
.navbar {
  background-color: #000;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

/* Logo */
.logo {
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: 2px;
  user-select: none;
  cursor: pointer;
}

/* Navigation Menu */
.nav-menu ul {
  list-style: none;
  display: flex;
  gap: 2rem;
  margin: 0;
  padding: 0;
}

.nav-menu ul li a {
  color: white;
  text-transform: uppercase;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  position: relative;
}

.nav-menu ul li a:hover {
  color: #FFD400;
}

.nav-menu ul li a::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #FFD400;
  transition: width 0.3s ease;
}

.nav-menu ul li a:hover::after {
  width: 100%;
}

/* Auth Buttons */
.auth-buttons {
  display: flex;
  gap: 1rem;
}

.auth-buttons button {
  border-radius: 9999px;
  font-weight: 700;
  padding: 0.4rem 1.2rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.85rem;
  text-transform: uppercase;
}

/* Login Button */
.login-btn {
  background: transparent;
  color: #FFD400;
  border: 2px solid #FFD400;
}

.login-btn:hover {
  background: #FFD400;
  color: #000;
}

/* Signup Button */
.signup-btn {
  background: #FFD400;
  color: #000;
}

.signup-btn:hover {
  background: #e6c700;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(255, 212, 0, 0.3);
}

/* Responsive Design */
@media (max-width: 900px) {
  .navbar {
    flex-wrap: wrap;
    padding: 1rem;
  }

  .nav-menu {
    display: none;
  }

  .auth-buttons {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 1rem;
  }

  .logo {
    width: 100%;
    text-align: center;
    margin-bottom: 0.5rem;
  }
}

@media (max-width: 600px) {
  .auth-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }

  .auth-buttons button {
    width: 100%;
  }
}
</style>