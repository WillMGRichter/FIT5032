<script setup>
import AppIcon from '@/components/common/AppIcon.vue'

const year = new Date().getFullYear()

const exploreLinks = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/about', label: 'About' },
]

const accountLinks = [
  { to: '/profile', label: 'Profile' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
]
</script>

<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <RouterLink to="/" class="footer-logo">
            <AppIcon name="leaf" class="footer-brand-icon" />
            <span>GreenLink</span>
          </RouterLink>
          <p>Discover, share, and collaborate on student projects.</p>
        </div>

        <nav class="footer-section" aria-label="Explore">
          <h2>Explore</h2>
          <ul>
            <li v-for="link in exploreLinks" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </nav>

        <nav class="footer-section" aria-label="Account">
          <h2>Account</h2>
          <ul>
            <li v-for="link in accountLinks" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </nav>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ year }} GreenLink. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* Mobile-first: sections stack vertically */
.footer-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
  padding-block: var(--spacing-xl);
}

/* Brand column */
.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary-dark);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.footer-brand-icon {
  color: var(--color-primary);
}

.footer-brand p {
  margin-block-start: var(--spacing-sm);
  max-width: 32ch;
}

/* Link columns */
.footer-section h2 {
  margin-block-end: var(--spacing-sm);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-section li + li {
  margin-block-start: var(--spacing-xs);
}

.footer-section a {
  color: var(--color-text-secondary);
}

.footer-section a:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

/* Copyright bar */
.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding-block: var(--spacing-md);
  color: var(--color-text-light);
  font-size: var(--font-size-xs);
}

.footer-bottom p {
  margin: 0;
}

/* Desktop: sections sit horizontally */
@media (min-width: 768px) {
  .footer-grid {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-2xl);
  }

  .footer-brand {
    max-width: 36ch;
  }
}
</style>
