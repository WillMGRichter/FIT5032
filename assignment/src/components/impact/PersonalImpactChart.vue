<script setup>
import { computed } from 'vue'
import ImpactChart from '@/components/impact/ImpactChart.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const chartData = computed(() => props.data.map((item) => ({ label: item.name, value: item.count })))

const textSummary = computed(() => {
  const items = props.data
  if (items.length === 0) return 'You have not joined any projects yet.'
  return (
    items
      .map((item) => `${item.count} ${item.name} project${item.count === 1 ? '' : 's'}`)
      .join(', ')
      .replace(/, ([^,]*)$/, ' and $1') + '.'
  )
})
</script>

<template>
  <div class="personal-impact-chart">
    <ImpactChart
      title="Participation by category"
      description="How the projects you've joined are spread across categories."
      :data="chartData"
    />
    <p class="personal-impact-chart__summary">You participated in {{ textSummary }}</p>
  </div>
</template>

<style scoped>
.personal-impact-chart__summary {
  margin-block-start: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>