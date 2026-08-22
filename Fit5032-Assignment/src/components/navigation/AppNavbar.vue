<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const isMenuOpen = ref(false)

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/about', label: 'About' },
  { to: '/profile', label: 'Profile' },
]

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}
</script>

<template>
  <header class="app-navbar">
    <div class="container navbar-inner">
      <RouterLink to="/" class="brand" @click="closeMenu">
        <AppIcon name="leaf" class="brand-icon" />
        <span>GreenLink</span>
      </RouterLink>

      <button
        type="button"
        class="menu-toggle"
        :aria-expanded="isMenuOpen"
        aria-controls="primary-navigation"
        :aria-label="isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
        @click="toggleMenu"
      >
        <AppIcon :name="isMenuOpen ? 'close' : 'menu'" />
      </button>

      <nav
        id="primary-navigation"
        class="nav-links"
        :class="{ 'is-open': isMenuOpen }"
        aria-label="Main navigation"
      >
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" @click="closeMenu">
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-navbar {
  position: relative;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

/* Brand */
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-block: var(--spacing-sm);
  color: var(--color-primary-dark);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.brand-icon {
  color: var(--color-primary);
}

/* Menu toggle button */
.menu-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.menu-toggle:hover {
  background-color: var(--color-background);
}

/*
 * Navigation: mobile-first collapsed dropdown.
 * Desktop becomes a horizontal row at >=768px.
 */
.nav-links {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 10;
  display: none;
  flex-direction: column;
  padding-block: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.nav-links.is-open {
  display: flex;
}

.nav-links a {
  padding: var(--spacing-sm) var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  white-space: nowrap;
}

.nav-links a:hover {
  color: var(--color-primary-dark);
  background-color: var(--color-background);
}

/* Active route indicator (Vue Router active classes) */
.nav-links a.router-link-exact-active {
  color: var(--color-primary-dark);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  text-decoration-color: var(--color-accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 6px;
}

@media (min-width: 768px) {
  .menu-toggle {
    display: none;
  }

  .nav-links {
    position: static;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-sm);
    padding-block: 0;
    border-bottom: 0;
    background-color: transparent;
    box-shadow: none;
  }

  .nav-links a {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }
}
</style>
