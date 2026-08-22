<script setup>
import AppNavbar from '@/components/navigation/AppNavbar.vue'
import AppFooter from '@/components/navigation/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppNavbar />
    <main class="app-main">
      <RouterView />
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
  padding: 1rem;
}
</style>
