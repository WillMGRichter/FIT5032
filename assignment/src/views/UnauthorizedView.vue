<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="unauthorized" aria-labelledby="unauthorized-heading">
    <div class="unauthorized__icon" aria-hidden="true">&#128274;</div>
    <h1 id="unauthorized-heading">Access Denied</h1>
    <p class="unauthorized__message">
      You don't have permission to view this page. If you believe this is an error, please contact
      an administrator.
    </p>
    <div class="unauthorized__actions">
      <button type="button" class="unauthorized__button" @click="router.push({ name: 'home' })">
        Back to Home
      </button>
      <button
        type="button"
        class="unauthorized__button unauthorized__button--secondary"
        @click="router.back()"
      >
        Go Back
      </button>
    </div>
  </section>
</template>

<style scoped>
.unauthorized {
  max-width: 480px;
  margin-inline: auto;
  text-align: center;
}

.unauthorized__icon {
  font-size: 3rem;
  margin-block-end: var(--spacing-md);
}

.unauthorized h1 {
  font-size: var(--font-size-xl);
  color: var(--color-error);
}

.unauthorized__message {
  margin-block: var(--spacing-md);
  color: var(--color-text-secondary);
}

.unauthorized__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-md);
}

.unauthorized__button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.unauthorized__button:hover {
  background-color: var(--color-primary-dark);
}

.unauthorized__button--secondary {
  background-color: transparent;
  color: var(--color-primary);
}

.unauthorized__button--secondary:hover {
  background-color: var(--color-background);
}
</style>
