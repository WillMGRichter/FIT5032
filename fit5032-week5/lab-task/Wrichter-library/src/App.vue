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

<style>
  .card {
    border: 1px solid #ccc;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .card-header {
    background-color: #275FDA;
    color: white;
    padding: 10px;
    border-radius: 10px 10px 0 0;
  }
  .list-group-item {
    padding: 10px;
  }
</style>