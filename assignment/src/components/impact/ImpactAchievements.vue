<script setup>
defineProps({
  achievements: { type: Array, default: () => [] },
})
</script>

<template>
  <section class="impact-achievements" aria-labelledby="impact-achievements-heading">
    <div class="impact-achievements__header">
      <h2 id="impact-achievements-heading">Your achievements</h2>
      <p class="impact-achievements__note">
        Unlocked from your real participation. Locked ones show how close you are.
      </p>
    </div>

    <ul class="impact-achievements__list">
      <li
        v-for="achievement in achievements"
        :key="achievement.id"
        class="impact-achievements__item"
        :class="{ 'impact-achievements__item--locked': !achievement.unlocked }"
      >
        <div class="impact-achievements__status" aria-hidden="true">
          <span v-if="achievement.unlocked" class="impact-achievements__tick">&#10003;</span>
        </div>
        <div class="impact-achievements__body">
          <h3 class="impact-achievements__title">
            {{ achievement.title }}
            <span
              v-if="achievement.unlocked"
              class="impact-achievements__badge"
              role="status"
            >
              Unlocked
            </span>
            <span v-else class="impact-achievements__badge impact-achievements__badge--locked">
              Locked
            </span>
          </h3>
          <p class="impact-achievements__description">{{ achievement.description }}</p>
          <div
            v-if="!achievement.unlocked"
            class="impact-achievements__progress"
            role="progressbar"
            :aria-valuenow="achievement.progress.percent"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${achievement.title}: ${achievement.progress.current} of ${achievement.progress.target}`"
          >
            <div
              class="impact-achievements__progress-bar"
              :style="{ width: `${achievement.progress.percent}%` }"
            ></div>
          </div>
          <p v-if="!achievement.unlocked" class="impact-achievements__progress-text">
            {{ achievement.progress.current }} / {{ achievement.progress.target }} ·
            {{ achievement.progress.percent }}%
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.impact-achievements__header {
  margin-block-end: var(--spacing-md);
}

.impact-achievements__note {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact-achievements__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--spacing-md);
  list-style: none;
  margin: 0;
  padding: 0;
}

.impact-achievements__item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.impact-achievements__item--locked {
  background-color: var(--color-background);
}

.impact-achievements__status {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f0f7f0;
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.impact-achievements__item--locked .impact-achievements__status {
  background-color: var(--color-border);
  color: var(--color-text-secondary);
  filter: grayscale(1);
}

.impact-achievements__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-md);
}

.impact-achievements__badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.impact-achievements__badge--locked {
  background-color: var(--color-text-secondary);
  color: var(--color-surface);
}

.impact-achievements__description {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact-achievements__progress {
  height: 10px;
  margin-block-start: var(--spacing-md);
  border-radius: var(--radius-sm);
  background-color: var(--color-border);
  overflow: hidden;
}

.impact-achievements__progress-bar {
  height: 100%;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-light);
}

.impact-achievements__progress-text {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>