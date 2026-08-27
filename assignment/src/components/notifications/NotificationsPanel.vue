<script setup>
import { ref, onMounted } from 'vue'
import * as notificationService from '@/services/notificationService'
import NotificationItem from '@/components/notifications/NotificationItem.vue'

const notifications = ref([])
const isLoading = ref(true)

const emit = defineEmits(['read-count-change'])

async function loadNotifications() {
  isLoading.value = true
  try {
    notifications.value = await notificationService.getNotifications()
  } catch {
    notifications.value = []
  } finally {
    isLoading.value = false
  }
}

async function handleMarkAsRead(id) {
  try {
    await notificationService.markAsRead(id)
    const n = notifications.value.find((n) => n.id === id)
    if (n) n.isRead = true
    emit('read-count-change')
  } catch { /* silent */ }
}

async function handleMarkAllAsRead() {
  try {
    await notificationService.markAllAsRead()
    notifications.value.forEach((n) => { n.isRead = true })
    emit('read-count-change')
  } catch { /* silent */ }
}

async function handleDelete(id) {
  try {
    await notificationService.deleteNotification(id)
    notifications.value = notifications.value.filter((n) => n.id !== id)
    emit('read-count-change')
  } catch { /* silent */ }
}

onMounted(loadNotifications)
</script>

<template>
  <div class="notifications-panel">
    <div class="notifications-panel__header">
      <h3 class="notifications-panel__title">Notifications</h3>
      <button
        v-if="notifications.length"
        type="button"
        class="notifications-panel__read-all"
        @click="handleMarkAllAsRead"
      >
        Mark all read
      </button>
    </div>
    <div v-if="isLoading" class="notifications-panel__empty">Loading...</div>
    <div v-else-if="notifications.length === 0" class="notifications-panel__empty">
      No notifications yet.
    </div>
    <div v-else class="notifications-panel__list">
      <NotificationItem
        v-for="n in notifications"
        :key="n.id"
        :notification="n"
        @read="handleMarkAsRead"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.notifications-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 340px;
  max-height: 400px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 20;
  overflow: hidden;
}

.notifications-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.notifications-panel__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.notifications-panel__read-all {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.notifications-panel__read-all:hover {
  text-decoration: underline;
}

.notifications-panel__list {
  overflow-y: auto;
  max-height: 340px;
}

.notifications-panel__empty {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--font-size-sm);
}
</style>
