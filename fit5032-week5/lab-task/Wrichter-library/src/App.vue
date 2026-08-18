<script setup>
import BHeader from './components/BHeader.vue';
</script>

<template>
  <div class="container">
    <header class="main-container">
      <BHeader />
    </header>

    <main class="main-box">
      <router-view></router-view>
    </main>
  </div>
</template>