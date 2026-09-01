<script setup>
import { computed, onMounted, ref } from 'vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { getProjects } from '@/services/projectService'

const FEATURED_COUNT = 3

const projects = ref([])
const isLoading = ref(true)
const hasError = ref(false)

const statusOrder = { active: 0, planned: 1, completed: 2, cancelled: 3 }

const featuredProjects = computed(() =>
  [...projects.value]
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
    .slice(0, FEATURED_COUNT),
)

onMounted(async () => {
  try {
    projects.value = (await getProjects()) ?? []
  } catch {
    hasError.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section aria-labelledby="featured-title">
    <SectionHeader
      eyebrow="Get involved"
      title="Featured projects"
      title-id="featured-title"
      intro="A snapshot of what's happening right now across Melbourne's suburbs."
    />

    <p v-if="isLoading" class="featured__state">Loading projects&hellip;</p>

    <p v-else-if="hasError" role="alert" class="featured__state">
      Couldn't load featured projects right now.
      <RouterLink :to="{ name: 'discover' }">Browse all projects instead</RouterLink>
    </p>

    <template v-else-if="featuredProjects.length > 0">
      <ul class="featured__grid">
        <li v-for="project in featuredProjects" :key="project.id" class="featured__item">
          <ProjectCard :project="project" />
        </li>
      </ul>
      <div class="featured__actions">
        <BaseButton :to="{ name: 'discover' }" variant="secondary">View all projects</BaseButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.featured__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--spacing-lg);
}

@media (min-width: 1200px) {
  .featured__grid {
    gap: var(--spacing-xl);
  }
}

.featured__item {
  display: flex;
}

.featured__actions {
  margin-top: var(--spacing-lg);
}

.featured__state {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  text-align: center;
}

.featured__state a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
</style>
