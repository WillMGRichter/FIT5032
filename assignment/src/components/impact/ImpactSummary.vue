<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, required: true },
  byCategory: { type: Array, default: () => [] },
})

function plural(n, singular, pluralWord) {
  return `${n} ${n === 1 ? singular : pluralWord}`
}

const categoryHighlight = computed(() => {
  const top = [...props.byCategory].sort((a, b) => b.projectCount - a.projectCount)[0]
  return top && top.projectCount > 0 ? top : null
})

const ratingSummary = computed(() => {
  const { averageRating, ratingCount } = props.summary
  if (averageRating == null || ratingCount === 0) {
    return 'No project ratings have been submitted yet onto the GreenLink platform.'
  }
  return `Across ${plural(ratingCount, 'rating', 'ratings')}, the average project rating is ${Number(averageRating).toFixed(1)} out of 5.`
})

const metricExplanations = computed(() => [
  {
    label: 'Total projects',
    text: 'The number of projects listed on GreenLink in the current view, across all statuses.',
  },
  {
    label: 'Active projects',
    text: 'Projects currently underway, not yet completed, cancelled or planned.',
  },
  {
    label: 'Participants',
    text: 'The number of unique registered users taking part in these projects.',
  },
  {
    label: 'Average rating',
    text: 'The mean of all star ratings (1–5) submitted by participants for these projects.',
  },
  {
    label: 'Planting totals',
    text: 'The total number of native plants recorded across project planting lists, and the number of distinct species involved.',
  },
  {
    label: 'Participants this month',
    text: 'How many participation sign-ups have happened in the current calendar month compared with the previous one.',
  },
])
</script>

<template>
  <section class="impact-summary" aria-labelledby="impact-summary-heading">
    <h2 id="impact-summary-heading" class="impact-summary__heading">What this tells us</h2>

    <div class="impact-summary__prose">
      <p>
        There are {{ plural(summary.totalProjects, 'project', 'projects') }} on GreenLink in the
        current view, of which {{ summary.activeProjects }} are active, {{ summary.plannedProjects }}
        planned and {{ summary.completedProjects }} completed.
        <template v-if="categoryHighlight">
          The most project-heavy category is {{ categoryHighlight.name }} with
          {{ plural(categoryHighlight.projectCount, 'project', 'projects') }}.
        </template>
      </p>
      <p>
        {{ plural(summary.participants, 'unique participant', 'unique participants') }}
        have joined the platform across {{ plural(summary.participations, 'participation', 'participations') }}.
        <template v-if="summary.participantsComparison">
          {{ summary.participantsComparison.thisMonth }} people signed up this month, compared with
          {{ summary.participantsComparison.previousMonth }} last month — a change of
          {{ Math.abs(summary.participantsComparison.delta) }}.
        </template>
      </p>
      <p>{{ ratingSummary }}</p>
      <p>
        GreenLink projects record
        {{ plural(summary.totalPlantings, 'native plant', 'native plants') }} across
        {{ plural(summary.speciesInvolved, 'species', 'species') }} in
        {{ plural(summary.projectsWithPlants, 'project', 'projects') }}, showing the community
        planting effort currently planned and delivered.
      </p>
    </div>

    <h3 class="impact-summary__subheading">How each metric is calculated</h3>
    <dl class="impact-summary__list">
      <div v-for="item in metricExplanations" :key="item.label" class="impact-summary__item">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.text }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.impact-summary {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.impact-summary__heading {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.impact-summary__prose {
  display: grid;
  gap: var(--spacing-sm);
  max-width: 75ch;
  font-size: var(--font-size-md);
  line-height: 1.6;
}

.impact-summary__prose p {
  margin: 0;
}

.impact-summary__subheading {
  margin: var(--spacing-lg) 0 var(--spacing-sm);
  font-size: var(--font-size-md);
}

.impact-summary__list {
  margin: 0;
}

.impact-summary__list > div + div {
  margin-block-start: var(--spacing-sm);
}

.impact-summary__item {
  display: grid;
  grid-template-columns: minmax(140px, 240px) 1fr;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.impact-summary__item dt {
  font-weight: var(--font-weight-semibold);
}

.impact-summary__item dd {
  margin: 0;
  color: var(--color-text-secondary);
}

@media (max-width: 575px) {
  .impact-summary__item {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }
}
</style>