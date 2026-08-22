<script setup></script>

<template>
  <header class="app-navbar">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/discover">Discover</RouterLink>
      <RouterLink to="/projects/create">Create Project</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/profile">Profile</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
      <RouterLink to="/register">Register</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.app-navbar {
  border-bottom: 1px solid #ccc;
}

.app-navbar nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
}
</style>
