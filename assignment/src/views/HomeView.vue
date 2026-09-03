<script setup>
import HeroSection from '@/components/home/HeroSection.vue'
import HowItWorks from '@/components/home/HowItWorks.vue'
import FeaturedProjects from '@/components/home/FeaturedProjects.vue'
import BaseButton from '@/components/common/BaseButton.vue'
</script>

<template>
  <div class="home">
    <HeroSection />

    <div class="container">
      <section class="home__section">
        <HowItWorks />
      </section>

      <section class="home__section">
        <FeaturedProjects />
      </section>

      <section class="home-cta" aria-labelledby="home-cta-title">
        <div class="home-cta__inner">
          <h2 id="home-cta-title">Ready to get your hands dirty?</h2>
          <p>Browse open projects and join the next planting day near you.</p>
          <BaseButton :to="{ name: 'discover' }">Find a project</BaseButton>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  margin-block-start: calc(-1 * var(--spacing-lg));
}

@media (min-width: 768px) {
  .home {
    margin-block-start: calc(-1 * var(--spacing-xl));
  }
}

@media (min-width: 1200px) {
  .home {
    margin-block-start: calc(-1 * var(--spacing-2xl));
  }
}

.home__section {
  margin-block-end: var(--spacing-2xl);
}

.home-cta {
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
  color: var(--color-surface);
}

.home-cta__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl) var(--spacing-lg);
  text-align: center;
}

@media (min-width: 768px) {
  .home-cta__inner {
    padding: var(--spacing-3xl) var(--spacing-2xl);
  }
}

.home-cta h2 {
  color: var(--color-surface);
}

.home-cta p {
  color: rgba(255, 255, 255, 0.88);
  max-width: 45ch;
}
</style>
