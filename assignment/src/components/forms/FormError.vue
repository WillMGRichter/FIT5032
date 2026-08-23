<script setup>
defineProps({
  id: { type: String, default: undefined },
  message: { type: String, default: '' },
})
</script>

<template>
  <p v-if="message" :id="id" class="form-error">{{ message }}</p>
</template>

<style scoped>
.form-error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
</style>
