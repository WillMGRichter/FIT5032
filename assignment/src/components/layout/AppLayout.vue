<script setup>
import AppNavbar from '@/components/navigation/AppNavbar.vue'
import AppFooter from '@/components/navigation/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppNavbar />
    <main class="app-main">
      <div class="container">
        <RouterView />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
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
