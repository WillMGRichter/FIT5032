import { computed, ref } from 'vue'

export function useProjectFilters(projects) {
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const selectedStatus = ref('')

  const filteredProjects = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return projects.value.filter((project) => {
      const matchesQuery =
        !query ||
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)

      const matchesCategory =
        !selectedCategory.value || project.categoryId === selectedCategory.value

      const matchesStatus = !selectedStatus.value || project.status === selectedStatus.value

      return matchesQuery && matchesCategory && matchesStatus
    })
  })

  const hasActiveFilters = computed(
    () =>
      searchQuery.value.trim() !== '' ||
      selectedCategory.value !== '' ||
      selectedStatus.value !== '',
  )

  function clearFilters() {
    searchQuery.value = ''
    selectedCategory.value = ''
    selectedStatus.value = ''
  }

  return {
    searchQuery,
    selectedCategory,
    selectedStatus,
    filteredProjects,
    hasActiveFilters,
    clearFilters,
  }
}
