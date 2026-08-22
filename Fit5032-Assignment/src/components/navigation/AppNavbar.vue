<script setup></script>

<template>
  <header class="app-navbar">
    <div class="container navbar-inner">
      <!-- Brand placeholder; menu toggle button can slot beside nav for mobile later -->
      <nav class="nav-links" aria-label="Main navigation">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/discover">Discover</RouterLink>
        <RouterLink to="/projects/create">Create Project</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink to="/profile">Profile</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
        <RouterLink to="/register">Register</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-navbar {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  padding-block: var(--spacing-sm);
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs) var(--spacing-md);
}

.nav-links a {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.nav-links a:hover {
  color: var(--color-primary-dark);
  background-color: var(--color-background);
}

.nav-links a.router-link-exact-active {
  color: var(--color-primary-dark);
  font-weight: var(--font-weight-medium);
}

@media (min-width: 768px) {
  .nav-links {
    gap: var(--spacing-sm) var(--spacing-lg);
  }

  .nav-links a {
    font-size: var(--font-size-md);
  }
}
</style>
