import { createRouter, createWebHistory } from 'vue-router'

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
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
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

export default router
