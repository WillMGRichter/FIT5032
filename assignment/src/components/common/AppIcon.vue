<script setup>
defineProps({
  name: {
    type: String,
    required: true,
    validator: (value) =>
      [
        'leaf',
        'menu',
        'close',
        'search',
        'users',
        'sprout',
        'thermometer',
        'feather',
        'map-pin',
      ].includes(value),
  },
  size: {
    type: [Number, String],
    default: 24,
  },
})
</script>

<template>
  <!--
    Reusable inline SVG icon.
    Decorative by default: colour comes from CSS `currentColor`,
    so set `color` on the component (or a parent) to tint it.
  -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'leaf'">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </template>

    <template v-else-if="name === 'menu'">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </template>

    <template v-else-if="name === 'close'">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>

    <template v-else-if="name === 'users'">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>

    <template v-else-if="name === 'sprout'">
      <path d="M12 22v-9" />
      <path d="M12 13c0-4.5 3.5-8 9-8 0 4.5-3.5 8-9 8Z" />
      <path d="M12 13c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6Z" />
    </template>

    <template v-else-if="name === 'thermometer'">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </template>

    <template v-else-if="name === 'feather'">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </template>

    <template v-else-if="name === 'map-pin'">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </template>
  </svg>
</template>
