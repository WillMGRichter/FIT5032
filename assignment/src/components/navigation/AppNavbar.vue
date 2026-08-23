<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const isMenuOpen = ref(false)

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/plants', label: 'Plants' },
  { to: '/about', label: 'About' },
]

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

async function handleLogout() {
  closeMenu()
  await authStore.logout()
  router.push({ name: 'home' })
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

        <template v-if="authStore.isAuthenticated.value">
          <RouterLink
            to="/profile"
            class="nav-links__account"
            @click="closeMenu"
          >
            Profile
          </RouterLink>
          <button type="button" class="nav-links__logout" @click="handleLogout">Logout</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-links__account" @click="closeMenu">Login</RouterLink>
          <RouterLink to="/register" class="nav-links__cta" @click="closeMenu">
            Register
          </RouterLink>
        </template>
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
  min-width: 44px;
  min-height: 44px;
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
  padding: var(--spacing-md) var(--spacing-lg);
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

.nav-links__logout {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  background: none;
  color: var(--color-error);
  font-size: var(--font-size-md);
  text-align: left;
}

.nav-links__logout:hover {
  color: var(--color-error);
  text-decoration: underline;
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

  .nav-links__logout {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: inherit;
  }

  .nav-links__cta {
    padding: var(--spacing-xs) var(--spacing-lg);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }

  .nav-links__cta:hover {
    background-color: var(--color-primary);
    color: var(--color-surface);
  }
}
</style>
