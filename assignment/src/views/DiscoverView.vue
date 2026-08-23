<script setup>
import { onMounted, ref } from 'vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import { getProjects } from '@/services/projectService'

const projects = ref([])
const isLoading = ref(true)
const error = ref(null)

async function loadProjects() {
  isLoading.value = true
  error.value = null
  try {
    projects.value = (await getProjects()) ?? []
  } catch (err) {
    error.value =
      err instanceof Error && err.message
        ? err.message
        : 'Something went wrong while loading projects.'
    projects.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadProjects)
</script>

<template>
  <section class="discover" aria-labelledby="discover-heading">
    <header class="discover__header">
      <h1 id="discover-heading">Discover Projects</h1>
      <p class="discover__intro">
        Join hands-on greening projects across Melbourne and help restore habitat, canopy and
        community.
      </p>
    </header>

    <p v-if="isLoading" class="discover__state">Loading projects&hellip;</p>

    <div v-else-if="error" role="alert" class="discover__state discover__state--error">
      <h2>We couldn't load projects</h2>
      <p>{{ error }}</p>
      <button type="button" class="discover__retry" @click="loadProjects">Try again</button>
    </div>

    <div v-else-if="projects.length === 0" class="discover__state discover__state--empty">
      <h2>No projects yet</h2>
      <p>There are no projects to show right now. Check back soon!</p>
    </div>

    <ul v-else class="discover__grid">
      <li v-for="project in projects" :key="project.id" class="discover__item">
        <ProjectCard :project="project" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.discover__header {
  margin-block-end: var(--spacing-xl);
}

.discover__intro {
  margin-top: var(--spacing-sm);
  max-width: 60ch;
  color: var(--color-text-secondary);
}

.discover__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.discover__state h2 {
  font-size: var(--font-size-lg);
}

.discover__state p {
  margin-block-start: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.discover__state--error h2 {
  color: var(--color-error);
}

.discover__retry {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.discover__retry:hover {
  background-color: var(--color-primary-dark);
}

.discover__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.discover__item {
  display: flex;
}
</style>
