<!-- BR (E.3) Accessibility: -->
<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAccessibilityStore } from '@/stores/accessibilityStore'

const { settings, setTextSize, toggle, reset } = useAccessibilityStore()

const isOpen = ref(false)
const panelRef = ref(null)
const triggerRef = ref(null)

const textSizes = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
]

const toggles = [
  { key: 'highContrast', label: 'High contrast' },
  { key: 'underlineLinks', label: 'Underline links' },
  { key: 'reduceMotion', label: 'Reduce motion' },
]

// Opens the options panel.
async function open() {
  isOpen.value = true
  await nextTick()
  // Move focus into the panel.
  panelRef.value?.querySelector('input, button')?.focus()
}

// Closes the options panel.
function close({ restoreFocus = true } = {}) {
  isOpen.value = false
  if (restoreFocus) triggerRef.value?.focus()
}

// Toggles the options panel.
function toggleOpen() {
  if (isOpen.value) close()
  else open()
}

// Closes the panel when Escape is pressed.
function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    close()
  }
}

// Closes the panel after an outside click.
function handlePointerDown(event) {
  if (!isOpen.value) return
  const target = event.target
  if (panelRef.value?.contains(target) || triggerRef.value?.contains(target)) return
  // Leave focus alone after an outside click.
  close({ restoreFocus: false })
}

// Listen for keyboard and outside-click dismissal.
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousedown', handlePointerDown)
})

// Remove the page listeners when the widget is removed.
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handlePointerDown)
})
</script>

<template>
  <div class="a11y-widget">
    <!-- Accessibility settings panel -->
    <div
      v-if="isOpen"
      id="a11y-panel"
      ref="panelRef"
      class="a11y-panel"
      role="dialog"
      aria-labelledby="a11y-title"
    >
      <!-- Panel heading and close control -->
      <div class="a11y-panel__header">
        <h2 id="a11y-title" class="a11y-panel__title">Accessibility</h2>
        <button
          type="button"
          class="a11y-panel__close"
          aria-label="Close accessibility options"
          @click="close()"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </div>

      <!-- Text-size choices -->
      <fieldset class="a11y-group">
        <legend class="a11y-group__legend">Text size</legend>
        <div class="a11y-radios">
          <label v-for="option in textSizes" :key="option.value" class="a11y-choice">
            <input
              type="radio"
              name="a11y-text-size"
              :value="option.value"
              :checked="settings.textSize === option.value"
              @change="setTextSize(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Display settings -->
      <fieldset class="a11y-group">
        <legend class="a11y-group__legend">Display</legend>
        <div class="a11y-switches">
          <label v-for="item in toggles" :key="item.key" class="a11y-switch">
            <input type="checkbox" :checked="settings[item.key]" @change="toggle(item.key)" />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Restore default settings -->
      <button type="button" class="a11y-reset" @click="reset">Reset to defaults</button>
    </div>

    <!-- Opens the accessibility panel -->
    <button
      ref="triggerRef"
      type="button"
      class="a11y-trigger"
      :aria-expanded="isOpen"
      aria-controls="a11y-panel"
      aria-label="Accessibility options"
      @click="toggleOpen"
    >
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="5" r="2.2" />
        <path d="M12 7.3v5.2" />
        <path d="M4.5 9.8c4.9 1.7 10.1 1.7 15 0" />
        <path d="M9.2 21 12 12.5l2.8 8.5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.a11y-widget {
  position: fixed;
  right: var(--spacing-md);
  bottom: var(--spacing-md);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.a11y-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: 1px solid var(--color-primary);
  border-radius: 50%;
  background-color: var(--color-primary);
  color: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.a11y-trigger:hover {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.a11y-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: min(320px, calc(100vw - 2 * var(--spacing-md)));
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.a11y-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.a11y-panel__title {
  margin: 0;
  font-size: var(--font-size-md);
}

.a11y-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-secondary);
}

.a11y-panel__close:hover {
  color: var(--color-text);
  background-color: var(--color-background);
}

.a11y-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin: 0;
  padding: 0;
  border: none;
}

.a11y-group__legend {
  padding: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.a11y-radios {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.a11y-choice,
.a11y-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 44px;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.a11y-switch {
  width: 100%;
}

.a11y-choice:hover,
.a11y-switch:hover {
  border-color: var(--color-primary);
}

.a11y-choice input,
.a11y-switch input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.a11y-choice:has(input:checked),
.a11y-switch:has(input:checked) {
  border-color: var(--color-primary);
  background-color: var(--color-background);
  font-weight: var(--font-weight-semibold);
}

.a11y-reset {
  align-self: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.a11y-reset:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}
</style>
