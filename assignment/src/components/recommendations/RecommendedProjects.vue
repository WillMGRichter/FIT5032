<script setup>
import { computed, onMounted, ref } from 'vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import InterestPicker from '@/components/recommendations/InterestPicker.vue'
import { getRecommendedProjects } from '@/services/recommendationService'
import { getProjects } from '@/services/projectService'
import { getMyProjects } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  limit: { type: Number, default: 5 },
})

const authStore = useAuthStore()

const projects = ref([])
const participation = ref({ created: [], joined: [] })
const isLoading = ref(true)
const loadError = ref(null)
const showPreferences = ref(false)

const recommendations = computed(() => {
  if (isLoading.value || loadError.value) return []
  return getRecommendedProjects(authStore.state.user, projects.value, participation.value, {
    limit: props.limit,
  })
})

const hasPersonalisation = computed(() => {
  const user = authStore.state.user
  return Boolean(
    user?.interests?.length || participation.value.joined.length || participation.value.created.length,
  )
})

const sectionNote = computed(() => {
  if (hasPersonalisation.value) {
    return 'Ranked for you from your interests, past participation, location and ratings.'
  }
  return 'Showcasing highly rated, active and popular projects.'
})

async function load() {
  isLoading.value = true
  loadError.value = null
  try {
    const [allProjects, mine] = await Promise.all([getProjects(), getMyProjects()])
    projects.value = allProjects ?? []
    participation.value = mine ?? { created: [], joined: [] }
  } catch (err) {
    loadError.value = err instanceof Error && err.message ? err.message : 'Could not load recommendations.'
  } finally {
    isLoading.value = false
  }
}

function togglePreferences() {
  showPreferences.value = !showPreferences.value
}

function onPreferencesSaved() {
  showPreferences.value = false
  load()
}

onMounted(load)
</script>

<template>
  <section class="recommended" aria-labelledby="recommended-heading">
    <div class="recommended__header">
      <div>
        <h2 id="recommended-heading">Projects For You</h2>
        <p class="recommended__note">{{ sectionNote }}</p>
      </div>
      <button
        type="button"
        class="recommended__prefs-toggle"
        :aria-expanded="showPreferences"
        aria-controls="recommended-preferences"
        @click="togglePreferences"
      >
        {{ showPreferences ? 'Hide preferences' : 'Personalise with your interests' }}
      </button>
    </div>

    <div v-if="showPreferences" id="recommended-preferences" class="recommended__preferences">
      <InterestPicker @saved="onPreferencesSaved" />
    </div>

    <div v-if="isLoading" class="recommended__state">Working out what fits you best&hellip;</div>

    <div v-else-if="loadError" role="alert" class="recommended__state recommended__state--error">
      <p>{{ loadError }}</p>
      <button type="button" class="recommended__retry" @click="load">Try again</button>
    </div>

    <ul v-else-if="recommendations.length" class="recommended__grid">
      <li v-for="item in recommendations" :key="item.project.id" class="recommended__item">
        <div v-if="item.reasons.length" class="recommended__why">
          <span class="recommended__why-icon" aria-hidden="true">&#9733;</span>
          <p class="recommended__why-text">
            <strong>Recommended because</strong>
            <span>{{ item.reasons.join(' ') }}</span>
          </p>
        </div>
        <ProjectCard :project="item.project" />
      </li>
    </ul>

    <div v-else class="recommended__state">
      <p>No new recommendations right now — try adjusting your interests above, or browse all projects.</p>
      <RouterLink :to="{ name: 'discover' }" class="recommended__retry">Browse all projects</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.recommended {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.recommended__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm) var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.recommended__note {
  margin-top: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.recommended__prefs-toggle {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.recommended__prefs-toggle:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.recommended__preferences {
  margin-block-end: var(--spacing-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-background);
}

.recommended__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--spacing-lg);
  list-style: none;
  margin: 0;
  padding: 0;
}

.recommended__item {
  display: flex;
  flex-direction: column;
}

.recommended__why {
  display: flex;
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background-color: #f0f7f0;
}

.recommended__why-icon {
  flex-shrink: 0;
  color: #f59e0b;
}

.recommended__why-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.recommended__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.recommended__state p {
  margin: 0;
}

.recommended__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.recommended__retry {
  display: inline-block;
  margin-block-start: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

@media (max-width: 575px) {
  .recommended__grid {
    grid-template-columns: 1fr;
  }
}
</style>