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
        'bell',
        'check',
        'trash',
        'check-check',
        'mail',
        'send',
        'paperclip',
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

    <template v-else-if="name === 'bell'">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </template>

    <template v-else-if="name === 'check'">
      <polyline points="20 6 9 17 4 12" />
    </template>

    <template v-else-if="name === 'check-check'">
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-9.5 9.5L10 17" />
    </template>

    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </template>

    <template v-else-if="name === 'mail'">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </template>

    <template v-else-if="name === 'send'">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </template>

    <template v-else-if="name === 'paperclip'">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </template>
  </svg>
</template>
