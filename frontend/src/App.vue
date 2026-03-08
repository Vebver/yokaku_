<template>
  <div class="container py-4">
    <header class="text-center py-4 border-bottom">
      <h1 class="mb-3">My App</h1>
      <p class="lead">Welcome to your application</p>
    </header>
    
    <main class="py-4">
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h2 class="card-title">Dashboard</h2>
          <p class="card-text">This is a simple dashboard layout.</p>
          <button class="btn btn-primary">Get Started</button>
        </div>
      </div>
      
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h2 class="card-title">Features</h2>
          <ul class="list-group list-group-flush">
            <li class="list-group-item">Feature 1</li>
            <li class="list-group-item">Feature 2</li>
            <li class="list-group-item">Feature 3</li>
          </ul>
        </div>
      </div>
    </main>
    
    <footer class="text-center py-3 border-top text-muted">
      <p class="mb-0">&copy; 2024 My App. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('Welcome to My App')
</script>



