import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/discover',
    name: 'discover',
    component: () => import('@/views/DiscoverView.vue'),
  },
  {
    path: '/projects/create',
    name: 'create-project',
    component: () => import('@/views/CreateProjectView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id',
    name: 'project-details',
    component: () => import('@/views/ProjectDetailsView.vue'),
  },
  {
    path: '/projects/:id/edit',
    name: 'edit-project',
    component: () => import('@/views/EditProjectView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.init()

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated.value) {
    return { name: 'home' }
  }

  return true
})

export default router
