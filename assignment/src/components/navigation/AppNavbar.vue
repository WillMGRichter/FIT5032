<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/composables/usePermissions'
import NotificationsPanel from '@/components/notifications/NotificationsPanel.vue'

const authStore = useAuthStore()
const { isAdmin } = usePermissions()

const isMenuOpen = ref(false)
const isNotificationsOpen = ref(false)
const notificationsRef = ref(null)

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/plants', label: 'Plants' },
  { to: '/impact', label: 'Impact' },
  { to: '/about', label: 'About' },
]

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

function toggleNotifications() {
  isNotificationsOpen.value = !isNotificationsOpen.value
}

function closeNotifications() {
  isNotificationsOpen.value = false
}

function handleClickOutside(event) {
  if (notificationsRef.value && !notificationsRef.value.contains(event.target)) {
    closeNotifications()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
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
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" @click="closeMenu; closeNotifications()">
          {{ item.label }}
        </RouterLink>

        <template v-if="authStore.isAuthenticated.value">
          <div class="profile-dropdown">
            <RouterLink to="/profile" class="profile-dropdown__trigger" @click="closeMenu; closeNotifications()">
              Profile
            </RouterLink>
            <div class="profile-dropdown__menu">
              <RouterLink to="/impact/me" @click="closeMenu; closeNotifications()">
                My Impact
              </RouterLink>
              <RouterLink to="/actions" @click="closeMenu; closeNotifications()">
                My Actions
              </RouterLink>
            </div>
          </div>
          <RouterLink v-if="isAdmin" to="/admin" class="nav-links__admin" @click="closeMenu; closeNotifications()">
            Admin
          </RouterLink>
          <div ref="notificationsRef" class="notifications-wrapper">
            <button
              type="button"
              class="notifications-toggle"
              :aria-expanded="isNotificationsOpen"
              :aria-label="
                authStore.state.unreadCount > 0
                  ? `Notifications, ${authStore.state.unreadCount} unread`
                  : 'Notifications'
              "
              @click="toggleNotifications"
            >
              <AppIcon name="bell" :size="20" />
              <span v-if="authStore.state.unreadCount > 0" class="notifications-badge">
                {{ authStore.state.unreadCount > 99 ? '99+' : authStore.state.unreadCount }}
              </span>
            </button>
            <NotificationsPanel
              v-if="isNotificationsOpen"
              class="notifications-dropdown"
              @read-count-change="authStore.refreshUnreadCount"
              @click.stop
            />
          </div>
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

/* Profile hover dropdown */
.profile-dropdown {
  display: flex;
  flex-direction: column;
}

.profile-dropdown__menu {
  display: flex;
  flex-direction: column;
}

.nav-links__admin {
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-md);
}

.nav-links__admin:hover {
  color: var(--color-primary-dark);
  background-color: var(--color-background);
}

/* Notifications */
.notifications-wrapper {
  position: relative;
}

.notifications-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: var(--spacing-xs);
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.notifications-toggle:hover {
  color: var(--color-primary-dark);
  background-color: var(--color-background);
}

.notifications-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background-color: var(--color-error);
  color: #fff;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  line-height: 18px;
  text-align: center;
  pointer-events: none;
}

.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xs);
}

@media (min-width: 768px) {
  .notifications-dropdown {
    right: 0;
  }
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

  .profile-dropdown {
    position: relative;
  }

  .profile-dropdown__menu {
    position: absolute;
    top: 100%;
    right: 0;
    display: none;
    flex-direction: column;
    min-width: 180px;
    padding-block: var(--spacing-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-md);
  }

  .profile-dropdown:hover .profile-dropdown__menu,
  .profile-dropdown:focus-within .profile-dropdown__menu {
    display: flex;
  }

  .profile-dropdown__menu a {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: 0;
    white-space: nowrap;
  }

  .profile-dropdown__menu a:hover {
    color: var(--color-primary-dark);
    background-color: var(--color-background);
  }

  .profile-dropdown__menu a.router-link-exact-active {
    text-decoration: none;
  }

  .nav-links__admin {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: inherit;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
  }

  .nav-links__admin:hover {
    background-color: var(--color-primary);
    color: var(--color-surface);
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
