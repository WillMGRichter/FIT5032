<script setup></script>

<template>
  <header>
    <nav>
      <ul>
        <li><RouterLink to="/">Home</RouterLink></li>
        <li><RouterLink to="/discover">Discover</RouterLink></li>
        <li><RouterLink to="/projects/create">Create Project</RouterLink></li>
        <li><RouterLink to="/projects/1">Project Details</RouterLink></li>
        <li><RouterLink to="/projects/1/edit">Edit Project</RouterLink></li>
        <li><RouterLink to="/about">About</RouterLink></li>
        <li><RouterLink to="/login">Login</RouterLink></li>
        <li><RouterLink to="/register">Register</RouterLink></li>
        <li><RouterLink to="/profile">Profile</RouterLink></li>
        <li><RouterLink to="/does-not-exist">Not Found (404)</RouterLink></li>
      </ul>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped></style>
