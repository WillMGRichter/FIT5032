<script setup>
import AppIcon from '@/components/common/AppIcon.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import HowItWorks from '@/components/home/HowItWorks.vue'

const problems = [
  {
    icon: 'thermometer',
    title: 'A heating city',
    text: 'Melbourne is losing tree canopy just as heatwaves grow longer. Suburbs with the fewest trees can be several degrees hotter than leafy ones.',
  },
  {
    icon: 'feather',
    title: 'Disappearing habitat',
    text: 'As green spaces shrink and fragment, the birds, insects and small mammals that keep our ecosystems healthy lose the corridors they need to survive.',
  },
  {
    icon: 'map-pin',
    title: 'Disconnected communities',
    text: 'Most residents want to help but don\u2019t know where local planting days happen or how their effort fits into the bigger picture.',
  },
]

const focusAreas = [
  {
    title: 'Canopy',
    text: 'Plant and establish trees that will shade streets, parks and schools for decades.',
  },
  {
    title: 'Habitat',
    text: 'Rebuild understorey and ground-layer habitat with indigenous species suited to each site.',
  },
  {
    title: 'Community',
    text: 'Give every Melburnian a practical way to contribute, learn and meet their neighbours.',
  },
]

const impactStats = [
  { value: '12', label: 'projects across Melbourne' },
  { value: '3,200+', label: 'native plants in the ground' },
  { value: '480', label: 'volunteers involved' },
]

const values = [
  {
    title: 'Community-led',
    text: 'Projects start with local residents, schools and councils \u2014 we provide the platform, structure and support.',
  },
  {
    title: 'Science-based',
    text: 'Species selection and planting plans follow best-practice ecological guidance for Melbourne\u2019s soils and climate.',
  },
  {
    title: 'Open to everyone',
    text: 'No experience or equipment needed. Every project lists exactly what volunteers should bring and expect.',
  },
]
</script>

<template>
  <div class="about">
    <header class="about__hero">
      <p class="about__eyebrow">About GreenLink</p>
      <h1>Reconnecting people, plants and place</h1>
      <p class="about__intro">
        GreenLink is a community platform that coordinates hands-on urban greening projects across
        Melbourne &mdash; so anyone can find a local project, lend a hand and watch their
        neighbourhood change for good.
      </p>
      <div class="about__actions">
        <BaseButton :to="{ name: 'discover' }">Explore projects</BaseButton>
      </div>
    </header>

    <section class="about__section" aria-labelledby="problem-title">
      <SectionHeader
        eyebrow="The problem"
        title="Why Melbourne needs GreenLink"
        title-id="problem-title"
        intro="Our city loves its green character, but the pressures on it are real and growing."
      />
      <div class="about__cards">
        <article v-for="problem in problems" :key="problem.title" class="about-card">
          <AppIcon :name="problem.icon" :size="28" class="about-card__icon" />
          <h3 class="about-card__title">{{ problem.title }}</h3>
          <p class="about-card__text">{{ problem.text }}</p>
        </article>
      </div>
    </section>

    <section class="about__section" aria-labelledby="purpose-title">
      <SectionHeader
        eyebrow="Our purpose"
        title="What GreenLink sets out to do"
        title-id="purpose-title"
        intro="We turn good intentions into trees in the ground by making participation simple, social and visible."
      />
      <div class="about__purpose">
        <div class="about__purpose-text">
          <p>
            GreenLink exists to reverse the decline of urban canopy and habitat by coordinating the
            people who care about it. Each project on the platform pairs a clear volunteer plan with
            the right mix of native species for that site.
          </p>
          <p>
            Progress is tracked openly &mdash; from planning through planting &mdash; so communities
            can see the difference they are making, project by project.
          </p>
        </div>
        <ul class="about__focus">
          <li v-for="area in focusAreas" :key="area.title" class="about-focus-item">
            <h3>{{ area.title }}</h3>
            <p>{{ area.text }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="about__section" aria-label="Our impact so far">
      <dl class="about__stats">
        <div v-for="stat in impactStats" :key="stat.label" class="about-stat">
          <dd>{{ stat.value }}</dd>
          <dt>{{ stat.label }}</dt>
        </div>
      </dl>
    </section>

    <section class="about__section" aria-label="How to participate">
      <HowItWorks />
    </section>

    <section class="about__section" aria-labelledby="organisation-title">
      <SectionHeader
        eyebrow="Who we are"
        title="Run by a not-for-profit, for the community"
        title-id="organisation-title"
        intro="GreenLink Melbourne Ltd is a registered not-for-profit association run by a small team and a wide network of volunteers."
      />
      <div class="about__cards">
        <article v-for="value in values" :key="value.title" class="about-card">
          <h3 class="about-card__title">{{ value.title }}</h3>
          <p class="about-card__text">{{ value.text }}</p>
        </article>
      </div>
    </section>

    <section class="about-cta" aria-labelledby="about-cta-title">
      <h2 id="about-cta-title">Every project starts with one volunteer</h2>
      <p>Find a greening project near you and be part of Melbourne's next canopy.</p>
      <BaseButton :to="{ name: 'discover' }">Discover projects</BaseButton>
    </section>
  </div>
</template>

<style scoped>
.about__hero {
  max-width: 720px;
}

.about__eyebrow {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.about h1 {
  margin-top: var(--spacing-xs);
}

.about__intro {
  margin-top: var(--spacing-md);
  color: var(--color-text-secondary);
}

.about__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.about__section {
  margin-block-start: var(--spacing-2xl);
}

.about__cards {
  display: grid;
  gap: var(--spacing-lg);
}

@media (min-width: 768px) {
  .about__cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.about-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.about-card__icon {
  color: var(--color-primary);
}

.about-card__title {
  font-size: var(--font-size-lg);
}

.about-card__text {
  margin-block-end: 0;
  color: var(--color-text-secondary);
}

.about__purpose {
  display: grid;
  gap: var(--spacing-xl);
}

@media (min-width: 992px) {
  .about__purpose {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: start;
  }
}

.about__purpose-text p {
  max-width: 60ch;
}

.about__purpose-text p:first-child {
  font-size: var(--font-size-lg);
}

.about__focus {
  display: grid;
  gap: var(--spacing-md);
}

.about-focus-item {
  padding: var(--spacing-md) var(--spacing-lg);
  border-inline-start: 4px solid var(--color-primary-light);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
}

.about-focus-item h3 {
  font-size: var(--font-size-md);
}

.about-focus-item p {
  margin-block-end: 0;
  color: var(--color-text-secondary);
}

.about__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: var(--spacing-lg);
  margin: 0;
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
}

.about-stat {
  text-align: center;
}

.about-stat dd {
  margin: 0;
  color: var(--color-surface);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.about-stat dt {
  margin-top: var(--spacing-xs);
  color: rgba(255, 255, 255, 0.88);
  font-size: var(--font-size-sm);
}

.about-cta {
  margin-block-start: var(--spacing-2xl);
  padding: var(--spacing-2xl) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
  color: var(--color-surface);
  text-align: center;
}

@media (min-width: 768px) {
  .about-cta {
    padding: var(--spacing-3xl) var(--spacing-2xl);
  }
}

.about-cta h2 {
  color: var(--color-surface);
}

.about-cta p {
  max-width: 45ch;
  margin-inline: auto;
  margin-block: var(--spacing-sm) var(--spacing-lg);
  color: rgba(255, 255, 255, 0.88);
}
</style>
