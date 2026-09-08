<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  data: { type: Array, default: () => [] },
  orientation: {
    type: String,
    default: 'vertical',
    validator: (value) => ['vertical', 'horizontal'].includes(value),
  },
  valueFormat: { type: Function, default: (value) => String(value) },
})

const WIDTH = 480
const HEIGHT = 260
const PAD_LEFT = 12
const PAD_RIGHT = 12
const PAD_TOP = 24
const PAD_BOTTOM = 44

const bars = computed(() => {
  const items = props.data ?? []
  const max = items.reduce((top, item) => Math.max(top, Number(item.value) || 0), 0)
  const scale = max > 0 ? max : 1

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = plotWidth / Math.max(items.length, 1)
  const barWidth = Math.min(slot * 0.72, 52)

  return items.map((item, index) => {
    const value = Number(item.value) || 0
    const ratio = value / scale
    if (props.orientation === 'horizontal') {
      const rowSlot = plotHeight / Math.max(items.length, 1)
      return {
        label: String(item.label),
        value,
        valueText: props.valueFormat(value),
        x: PAD_LEFT,
        y: PAD_TOP + index * rowSlot + (rowSlot - barWidth) / 2,
        width: ratio * plotWidth,
        height: Math.max(barWidth * 0.72, 8),
      }
    }
    return {
      label: String(item.label),
      value,
      valueText: props.valueFormat(value),
      x: Math.max(PAD_LEFT, PAD_LEFT + index * slot + (slot - barWidth) / 2),
      y: PAD_TOP + plotHeight - ratio * plotHeight,
      width: barWidth,
      height: ratio * plotHeight,
    }
  })
})

const chartSummary = computed(() => {
  const items = props.data ?? []
  if (items.length === 0) return `${props.title}: no data`
  const parts = items.map((item) => `${item.label}: ${props.valueFormat(Number(item.value) || 0)}`)
  return `${props.title}. ${parts.join(', ')}`
})

const viewBox = computed(() => {
  if (props.orientation === 'horizontal') {
    const n = Math.max(props.data?.length ?? 0, 1)
    const rowSlot = (HEIGHT - PAD_TOP - PAD_BOTTOM) / n
    const h = PAD_TOP + n * rowSlot + PAD_BOTTOM
    return `0 0 ${WIDTH} ${h}`
  }
  return `0 0 ${WIDTH} ${HEIGHT}`
})

const labelTicks = computed(() => {
  const items = props.data ?? []
  const slot = (WIDTH - PAD_LEFT - PAD_RIGHT) / Math.max(items.length, 1)
  return items.map((item, index) => ({
    label: String(item.label),
    x: PAD_LEFT + index * slot + slot / 2,
  }))
})
</script>

<template>
  <figure class="impact-chart" aria-labelledby="impact-chart-title">
    <figcaption>
      <h3 id="impact-chart-title" class="impact-chart__title">{{ title }}</h3>
      <p v-if="description" class="impact-chart__description">{{ description }}</p>
    </figcaption>

    <div v-if="bars.length" class="impact-chart__body">
      <svg
        class="impact-chart__svg"
        :viewBox="viewBox"
        role="img"
        :aria-label="chartSummary"
        preserveAspectRatio="xMidYMid meet"
      >
        <g v-if="orientation === 'vertical'" fill="var(--color-primary)" aria-hidden="true">
          <rect
            v-for="bar in bars"
            :key="bar.label"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="Math.max(bar.height, 1)"
            rx="2"
          >
            <title>{{ bar.label }}: {{ bar.valueText }}</title>
          </rect>
        </g>
        <g v-else fill="var(--color-primary)" aria-hidden="true">
          <rect
            v-for="bar in bars"
            :key="bar.label"
            :x="bar.x"
            :y="bar.y"
            :width="Math.max(bar.width, 1)"
            :height="bar.height"
            rx="2"
          >
            <title>{{ bar.label }}: {{ bar.valueText }}</title>
          </rect>
        </g>
        <g
          v-if="orientation === 'vertical'"
          fill="var(--color-text-secondary)"
          font-size="9"
          text-anchor="middle"
          aria-hidden="true"
        >
          <text v-for="tick in labelTicks" :key="tick.label" :x="tick.x" :y="HEIGHT - 14">
            {{ tick.label }}
          </text>
        </g>
      </svg>

      <table class="impact-chart__table">
        <caption class="sr-only">Data for {{ title }}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bar in bars" :key="bar.label">
            <td>{{ bar.label }}</td>
            <td>{{ bar.valueText }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="impact-chart__empty">No data to display yet.</p>
  </figure>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.impact-chart {
  margin: 0;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.impact-chart__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.impact-chart__description {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact-chart__body {
  margin-block-start: var(--spacing-md);
}

.impact-chart__svg {
  display: block;
  width: 100%;
  max-height: 320px;
  overflow: visible;
}

.impact-chart__table {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.impact-chart__empty {
  margin: var(--spacing-md) 0 0;
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>