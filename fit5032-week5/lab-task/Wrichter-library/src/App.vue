<script setup>
import JSON from './components/JSON.vue'
import Form from './components/LibraryRegistrationForm.vue'
</script>

<template>
  <div class="container">
    <header class="d-flex justify-content-center py-3">
      <ul class="nav nav-pills">
        <li class="nav-item">
          <a href="#" class="nav-link active" aria-current="page">Home (Week 5)</a>
        </li>
        <li class="nav-item"><a href="#" class="nav-link">About</a></li>
        <li class="nav-item"><a href="#" class="nav-link">Contact us</a></li>
      </ul>
    </header>
  </div>
  <JSON />
  <Form />
</template>