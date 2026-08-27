import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const authStore = useAuthStore()

  const user = computed(() => authStore.state.user)
  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function canCreateProject() {
    return isAuthenticated.value
  }

  function canManageProject(project) {
    if (!isAuthenticated.value || !project) return false
    if (isAdmin.value) return true
    return project.createdBy != null && project.createdBy === user.value.id
  }

  function canJoinProject(project) {
    if (!isAuthenticated.value || !project) return false
    return project.status !== 'cancelled' && project.status !== 'completed'
  }

  function canAccessAdmin() {
    return isAdmin.value
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    canCreateProject,
    canManageProject,
    canJoinProject,
    canAccessAdmin,
  }
}
