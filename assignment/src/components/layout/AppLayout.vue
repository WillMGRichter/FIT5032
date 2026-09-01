<script setup>
import AppNavbar from '@/components/navigation/AppNavbar.vue'
import AppFooter from '@/components/navigation/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <AppNavbar />
    <main id="main-content" tabindex="-1" class="app-main">
      <div class="container">
        <RouterView />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--spacing-sm);
  z-index: 1000;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  width: 100%;
  padding-block: var(--spacing-lg);
}

@media (min-width: 768px) {
  .app-main {
    padding-block: var(--spacing-xl);
  }
}

@media (min-width: 1200px) {
  .app-main {
    padding-block: var(--spacing-2xl);
  }
}
</style>
