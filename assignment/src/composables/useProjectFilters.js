import { computed, ref, watch } from 'vue'

export const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Project name' },
  { value: 'availability', label: 'Availability' },
  { value: 'rating', label: 'Rating' },
]

const DEFAULT_PAGE_SIZE = 9

export function useProjectFilters(projects, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const selectedStatus = ref('')
  const sortBy = ref('date')
  const currentPage = ref(1)

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

  const sortedProjects = computed(() => {
    const list = [...filteredProjects.value]
    const key = sortBy.value

    if (key === 'name') {
      list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
    } else if (key === 'availability') {
      list.sort((a, b) => {
        const aSpots = (a.capacity ?? 0) - (a.volunteerCount ?? 0)
        const bSpots = (b.capacity ?? 0) - (b.volunteerCount ?? 0)
        return bSpots - aSpots
      })
    } else if (key === 'rating') {
      list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    } else {
      list.sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    }

    return list
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(sortedProjects.value.length / pageSize)))

  const paginatedProjects = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return sortedProjects.value.slice(start, start + pageSize)
  })

  watch([searchQuery, selectedCategory, selectedStatus, sortBy], () => {
    currentPage.value = 1
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
    sortBy.value = 'date'
  }

  return {
    searchQuery,
    selectedCategory,
    selectedStatus,
    sortBy,
    currentPage,
    totalPages,
    pageSize,
    filteredProjects,
    sortedProjects,
    paginatedProjects,
    hasActiveFilters,
    clearFilters,
  }
}
