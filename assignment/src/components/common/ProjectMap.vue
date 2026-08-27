<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { escapeHtml } from '@/utils/sanitize'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  center: {
    type: Array,
    default: () => [-37.8136, 144.9631],
  },
  zoom: { type: Number, default: 10 },
})

const router = useRouter()

const mapContainer = ref(null)
const hasMapFailed = ref(false)

let map = null
let markerLayer = null

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const mappableProjects = computed(() =>
  props.projects.filter((project) => isValidCoord(project.latitude, project.longitude)),
)

const unmappedCount = computed(() => props.projects.length - mappableProjects.value.length)

function isValidCoord(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return !(lat === 0 && lng === 0)
}

function createPopupContent(project) {
  const href = router.resolve({
    name: 'project-details',
    params: { id: project.id },
  }).href

  const wrapper = document.createElement('div')
  wrapper.className = 'project-map__popup'
  wrapper.innerHTML = [
    `<strong>${escapeHtml(project.title)}</strong>`,
    `<span>${escapeHtml(project.location)}</span>`,
    `<a href="${href}">View project details</a>`,
  ].join('')
  return wrapper
}

function clearMarkers() {
  if (markerLayer) {
    markerLayer.clearLayers()
  }
}

function addMarkers() {
  if (!map || !markerLayer) return
  clearMarkers()

  mappableProjects.value.forEach((project) => {
    const marker = L.marker([Number(project.latitude), Number(project.longitude)])
    marker.bindPopup(createPopupContent(project))
    markerLayer.addLayer(marker)
  })

  if (mappableProjects.value.length > 0) {
    const bounds = L.latLngBounds(
      mappableProjects.value.map((project) => [
        Number(project.latitude),
        Number(project.longitude),
      ]),
    )
    map.fitBounds(bounds.pad(0.25), { maxZoom: 14 })
  }
}

function initMap() {
  if (!mapContainer.value || map) return
  try {
    map = L.map(mapContainer.value, {
      center: props.center,
      zoom: props.zoom,
      scrollWheelZoom: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    markerLayer = L.layerGroup().addTo(map)
    addMarkers()
  } catch {
    hasMapFailed.value = true
  }
}

watch(
  () => props.projects,
  () => {
    if (map) {
      addMarkers()
    }
  },
  { deep: true },
)

onMounted(initMap)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    markerLayer = null
  }
})
</script>

<template>
  <div class="project-map" role="region" aria-label="Map of projects">
    <div v-if="isLoading" class="project-map__overlay">Loading map data&hellip;</div>

    <div v-else-if="error" role="alert" class="project-map__overlay project-map__overlay--error">
      {{ error }}
    </div>

    <div
      v-else-if="hasMapFailed"
      role="alert"
      class="project-map__overlay project-map__overlay--error"
    >
      The map could not be loaded. Please check your connection and try again.
    </div>

    <template v-else>
      <div ref="mapContainer" class="project-map__canvas"></div>

      <p v-if="mappableProjects.length === 0" class="project-map__overlay">
        No projects with valid map coordinates to show yet.
      </p>

      <p v-else-if="unmappedCount > 0" class="project-map__note">
        {{ unmappedCount }} project{{ unmappedCount === 1 ? '' : 's' }} without coordinates are not
        shown on the map.
      </p>
    </template>
  </div>
</template>

<style scoped>
.project-map {
  position: relative;
  width: 100%;
  min-height: 300px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--color-surface);
}

.project-map__canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.project-map:not(:has(.project-map__canvas)) {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
}

@media (min-width: 768px) {
  .project-map {
    min-height: 420px;
    aspect-ratio: 16 / 9;
  }

  .project-map__canvas {
    position: absolute;
  }
}

.project-map__canvas :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  font: inherit;
}

.project-map__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  text-align: center;
}

.project-map__overlay--error {
  color: var(--color-error);
}

.project-map__note {
  position: absolute;
  bottom: var(--spacing-sm);
  left: var(--spacing-sm);
  z-index: 1;
  margin: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: rgb(255 255 255 / 0.9);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.project-map :deep(.leaflet-control-container .leaflet-top),
.project-map :deep(.leaflet-control-container .leaflet-bottom) {
  z-index: 2;
}
</style>
