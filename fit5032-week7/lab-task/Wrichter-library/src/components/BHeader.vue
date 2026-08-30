<template>
  <div class="container">
    <header class="d-flex justify-content-center py-3">
      <ul class="nav nav-pills">
        <li class="nav-item">
          <router-link to="/" class="nav-link" active-class="active" aria-current="page"
            >Home (Week 5)</router-link
          >
        </li>
        <li class="nav-item">
          <router-link to="/about" class="nav-link" active-class="active">About</router-link>
        </li>
        <li class="nav-item" v-if="isAuthenticated">
          <a class="nav-link" href="#" @click.prevent="handleLogout">Logout</a>
        </li>
        <li class="nav-item" v-else>
          <router-link to="/login" class="nav-link" active-class="active">Login</router-link>
        </li>
      </ul>
    </header>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { isAuthenticated } from '../auth.js'

const router = useRouter()

const handleLogout = () => {
  isAuthenticated.value = false
  router.push('/login')
}
</script>
