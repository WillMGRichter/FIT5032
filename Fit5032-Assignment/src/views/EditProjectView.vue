<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section>
    <h1>Edit Project</h1>
    <p>Project id: {{ route.params.id }}</p>
  </section>
</template>

<style scoped></style>
