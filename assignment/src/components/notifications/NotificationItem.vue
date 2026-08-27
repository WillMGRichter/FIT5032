<script setup>
defineProps({
  notification: { type: Object, required: true },
})

defineEmits(['read', 'delete'])
</script>

<template>
  <div class="notification-item" :class="{ 'is-unread': !notification.isRead }">
    <div class="notification-item__body">
      <p class="notification-item__title">{{ notification.title }}</p>
      <p class="notification-item__message">{{ notification.message }}</p>
      <p class="notification-item__time">{{ new Date(notification.createdAt).toLocaleString() }}</p>
    </div>
    <div class="notification-item__actions">
      <button
        v-if="!notification.isRead"
        type="button"
        class="notification-item__btn"
        title="Mark as read"
        @click="$emit('read', notification.id)"
      >
        &#10003;
      </button>
      <button
        type="button"
        class="notification-item__btn notification-item__btn--delete"
        title="Delete"
        @click="$emit('delete', notification.id)"
      >
        &#10005;
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.notification-item.is-unread {
  background-color: var(--color-background);
}

.notification-item__body {
  flex: 1;
  min-width: 0;
}

.notification-item__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 2px;
  color: var(--color-text);
}

.notification-item__message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.notification-item__time {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.notification-item__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.notification-item__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.notification-item__btn:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.notification-item__btn--delete:hover {
  color: var(--color-error);
}
</style>
