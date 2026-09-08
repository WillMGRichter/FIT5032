<script setup>
import { computed, onMounted, ref } from 'vue'
import ImpactMetricCard from '@/components/impact/ImpactMetricCard.vue'
import ImpactAchievements from '@/components/impact/ImpactAchievements.vue'
import PersonalImpactChart from '@/components/impact/PersonalImpactChart.vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import { getPersonalImpact } from '@/services/personalImpactService'
import { getMyProjects, getMyRatings } from '@/services/authService'

const isLoading = ref(true)
const loadError = ref(null)
const impact = ref(null)

const summary = computed(() => impact.value?.summary ?? null)
const byCategory = computed(() => impact.value?.byCategory ?? [])
const achievements = computed(() => impact.value?.achievements ?? [])
const recentProjects = computed(() => impact.value?.recentProjects ?? [])

const ratingCardValue = computed(() => {
  const s = summary.value
  if (!s) return '—'
  if (s.ratingsCount === 0) return '—'
  return s.averageRatingGiven.toFixed(1)
})

const ratingCardHint = computed(() => {
  const s = summary.value
  if (!s) return ''
  return s.ratingsCount > 0
    ? `${s.ratingsCount} rating${s.ratingsCount === 1 ? '' : 's'} submitted by you.`
    : 'Rate projects you\u2019ve joined to build this up.'
})

async function load() {
  isLoading.value = true
  loadError.value = null
  try {
    const [participation, ratings] = await Promise.all([getMyProjects(), getMyRatings()])
    impact.value = getPersonalImpact(0, [], {
      created: participation.created,
      joined: participation.joined,
      ratings,
    })
  } catch (err) {
    loadError.value =
      err instanceof Error && err.message ? err.message : 'Could not load your impact data.'
    impact.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="personal-impact" aria-labelledby="personal-impact-heading">
    <header class="personal-impact__header">
      <h1 id="personal-impact-heading">Your GreenLink Impact</h1>
      <p class="personal-impact__intro">
        A personal summary of what your participation has contributed, calculated from your
        real project activity, ratings and planting records.
      </p>
    </header>

    <div v-if="isLoading" class="personal-impact__state">Calculating your impact&hellip;</div>

    <div v-else-if="loadError" role="alert" class="personal-impact__state personal-impact__state--error">
      <h2>We couldn't load your impact</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="personal-impact__button" @click="load">Try again</button>
    </div>

    <template v-else-if="summary">
      <div class="personal-impact__metrics" aria-label="Personal impact metrics">
        <ImpactMetricCard
          label="Projects joined"
          :value="summary.projectsJoined"
          hint="The number of projects you have joined on GreenLink."
        />
        <ImpactMetricCard
          label="Active now"
          :value="summary.activeParticipations"
          hint="Participations in projects that are currently underway."
          tone="highlight"
        />
        <ImpactMetricCard
          label="Projects completed"
          :value="summary.completedProjects"
          hint="Joined projects that have been completed."
        />
        <ImpactMetricCard
          label="Categories explored"
          :value="summary.categoriesCount"
          hint="Distinct project categories you have participated in."
        />
        <ImpactMetricCard
          label="Ratings given"
          :value="summary.ratingsCount"
          hint="Star ratings you have submitted."
        />
        <ImpactMetricCard
          label="Average rating given"
          :value="ratingCardValue"
          :hint="ratingCardHint"
          tone="muted"
        />
        <ImpactMetricCard
          label="Native plants"
          :value="summary.totalPlants"
          :hint="`Total plants recorded across the projects you joined.`"
        />
      </div>

      <div class="personal-impact__grid">
        <div class="personal-impact__panel">
          <PersonalImpactChart :data="byCategory" />
        </div>
        <ImpactAchievements :achievements="achievements" />
      </div>

      <section class="personal-impact__recent" aria-labelledby="personal-impact-recent-heading">
        <h2 id="personal-impact-recent-heading">Recent projects</h2>
        <p class="personal-impact__recent-note">
          The latest projects you have joined, most recent first.
        </p>

        <div v-if="recentProjects.length" class="personal-impact__recent-grid">
          <ProjectCard
            v-for="project in recentProjects"
            :key="project.id"
            :project="project"
          />
        </div>
        <p v-else class="personal-impact__empty">
          You haven't joined any projects yet.
          <RouterLink :to="{ name: 'discover' }">Browse projects to get started</RouterLink>.
        </p>
      </section>

      <p class="personal-impact__footnote">
        All figures come from your own participation, ratings and planting data. No estimates
        are fabricated.
      </p>
    </template>
  </section>
</template>

<style scoped>
.personal-impact {
  max-width: 1200px;
  margin-inline: auto;
}

.personal-impact__header {
  margin-block-end: var(--spacing-lg);
}

.personal-impact__intro {
  margin-top: var(--spacing-sm);
  max-width: 62ch;
  color: var(--color-text-secondary);
}

.personal-impact__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.personal-impact__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.personal-impact__state h2 {
  margin-top: 0;
}

.personal-impact__button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.personal-impact__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.personal-impact__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  margin-block-end: var(--spacing-lg);
}

@media (min-width: 900px) {
  .personal-impact__grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

.personal-impact__recent {
  margin-block-start: var(--spacing-xl);
}

.personal-impact__recent-note {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.personal-impact__recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--spacing-lg);
  margin-block-start: var(--spacing-md);
}

.personal-impact__empty a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.personal-impact__footnote {
  margin-block-start: var(--spacing-lg);
  padding: var(--spacing-md);
  border-left: 3px solid var(--color-primary-light);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>