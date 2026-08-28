<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import AppIcon from '@/components/common/AppIcon.vue'

const emit = defineEmits(['select'])

const props = defineProps({
  projects: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  selectedProjectId: { type: [Number, String, null], default: null },
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
let searchLayer = null
let routeLayer = null
let resizeObserver = null
let searchRequestSeq = 0
let manualRequestSeq = 0
const markersByProjectId = new Map()

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref([])
const searchOpen = ref(false)
const searchMessage = ref('')
const searchState = ref('idle')
const selectedPlace = ref(null)

const directionsOpen = ref(false)
const directionsProject = ref(null)
const locating = ref(false)
const locationState = ref('idle')
const locationMessage = ref('')
const routeData = ref(null)
const routeError = ref('')
const routeComputing = ref(false)
const manualStartOpen = ref(false)
const manualQuery = ref('')
const manualSearching = ref(false)
const manualError = ref('')

let currentLocation = null
const startPoint = ref(null)

const mappableProjects = computed(() =>
  props.projects.filter((project) => isValidCoord(project.latitude, project.longitude)),
)

const unmappedCount = computed(() => props.projects.length - mappableProjects.value.length)

const origin = computed(() => {
  if (currentLocation) {
    return { lat: currentLocation.lat, lng: currentLocation.lng, label: 'Your current location' }
  }
  if (startPoint.value) return startPoint.value
  return null
})

const originLabel = computed(() => origin.value?.label ?? 'Not set yet')

function isValidCoord(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return !(lat === 0 && lng === 0)
}

function projectDetailsHref(project) {
  return router.resolve({ name: 'project-details', params: { id: project.id } }).href
}

function createPopupContent(project) {
  const wrapper = document.createElement('div')
  wrapper.className = 'project-map__popup'

  const title = document.createElement('strong')
  title.className = 'project-map__popup-title'
  title.textContent = project.title

  const location = document.createElement('span')
  location.className = 'project-map__popup-location'
  location.textContent = project.location

  const link = document.createElement('a')
  link.className = 'project-map__popup-link'
  link.href = projectDetailsHref(project)
  link.textContent = 'View project details'

  const directionsButton = document.createElement('button')
  directionsButton.type = 'button'
  directionsButton.className = 'project-map__popup-directions'
  directionsButton.textContent = 'Get Directions'
  directionsButton.addEventListener('click', () => openDirections(project))

  wrapper.append(title, location, link, directionsButton)
  return wrapper
}

function clearMarkers() {
  if (markerLayer) markerLayer.clearLayers()
}

function addMarkers() {
  if (!map || !markerLayer) return
  clearMarkers()
  markersByProjectId.clear()

  mappableProjects.value.forEach((project) => {
    const marker = L.marker([Number(project.latitude), Number(project.longitude)])
    marker.bindPopup(createPopupContent(project), { closeButton: true })
    marker.on('click', () => emit('select', project.id))
    markerLayer.addLayer(marker)
    markersByProjectId.set(project.id, marker)
  })

  if (mappableProjects.value.length > 0 && !routeData.value) {
    const bounds = L.latLngBounds(
      mappableProjects.value.map((project) => [
        Number(project.latitude),
        Number(project.longitude),
      ]),
    )
    map.fitBounds(bounds.pad(0.25), { maxZoom: 14 })
  }
}

function nominatimUrl(query, limit = 6) {
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(
    query,
  )}`
}

async function runSearch() {
  const query = searchQuery.value.trim()
  if (!query || isSearching.value) return

  const seq = ++searchRequestSeq
  isSearching.value = true
  searchState.value = 'idle'
  searchMessage.value = ''
  searchResults.value = []
  searchOpen.value = false

  try {
    const response = await fetch(nominatimUrl(query), {
      headers: { Accept: 'application/json' },
    })
    if (seq !== searchRequestSeq) return
    if (!response.ok) throw new Error('search failed')

    const data = await response.json()
    if (seq !== searchRequestSeq) return

    if (!Array.isArray(data) || data.length === 0) {
      searchState.value = 'empty'
      searchMessage.value = `No places found for "${query}". Try a street name, suburb or landmark.`
    } else {
      searchState.value = 'results'
      searchResults.value = data.slice(0, 6)
      searchOpen.value = true
    }
  } catch {
    if (seq !== searchRequestSeq) return
    searchState.value = 'error'
    searchMessage.value = 'Could not search places right now. Check your connection and try again.'
  } finally {
    if (seq === searchRequestSeq) isSearching.value = false
  }
}

function closeSearch() {
  searchOpen.value = false
}

function selectSearchResult(place) {
  const lat = Number(place.lat)
  const lng = Number(place.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

  searchQuery.value = place.display_name || searchQuery.value
  closeSearch()
  searchState.value = 'idle'
  searchMessage.value = ''

  selectedPlace.value = { lat, lng, name: place.display_name || searchQuery.value }
  showSearchPin(selectedPlace.value)
}

function showSearchPin(place) {
  if (!map || !searchLayer) return
  searchLayer.clearLayers()

  const marker = L.marker([place.lat, place.lng], {
    icon: L.divIcon({
      className: 'project-map__search-pin',
      html: '<span aria-hidden="true"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -22],
    }),
  })

  const popup = document.createElement('div')
  popup.className = 'project-map__popup'
  const title = document.createElement('strong')
  title.className = 'project-map__popup-title'
  title.textContent = 'Selected location'
  const detail = document.createElement('span')
  detail.className = 'project-map__popup-location'
  detail.textContent = `${place.name} — ${Number(place.lat).toFixed(5)}, ${Number(place.lng).toFixed(5)}`
  popup.append(title, detail)

  marker.bindPopup(popup).openPopup()
  searchLayer.addLayer(marker)

  map.setView([place.lat, place.lng], Math.max(map.getZoom(), 13), { animate: true })
}

function clearSelectedPlace() {
  if (searchLayer) searchLayer.clearLayers()
  selectedPlace.value = null
}

function decodePolyline(encoded) {
  const coordinates = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    result = 0
    shift = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / 1e5, lng / 1e5])
  }
  return coordinates
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`
}

function routeIcon(label, kind) {
  return L.divIcon({
    className: `project-map__route-icon project-map__route-icon--${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function clearRoute() {
  if (routeLayer) routeLayer.clearLayers()
  routeData.value = null
  routeError.value = ''
}

async function calculateRoute() {
  if (!map || !origin.value) {
    routeError.value = 'A starting point is needed before a route can be calculated.'
    return
  }
  if (!directionsProject.value) return

  routeComputing.value = true
  routeError.value = ''
  routeData.value = null
  clearRoute()

  const start = origin.value
  const end = {
    lat: Number(directionsProject.value.latitude),
    lng: Number(directionsProject.value.longitude),
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=polyline&steps=false`

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await response.json().catch(() => null)

    if (
      response.ok &&
      data &&
      data.code === 'Ok' &&
      Array.isArray(data.routes) &&
      data.routes.length > 0
    ) {
      const route = data.routes[0]
      const path = decodePolyline(route.geometry || '')
      if (path.length < 2) {
        routeError.value =
          'A route could not be calculated between this location and the project. Try a different start point.'
        return
      }

      routeLayer.clearLayers()

      L.polyline(path, {
        color: '#1f7a5a',
        weight: 5,
        opacity: 0.85,
      }).addTo(routeLayer)

      L.marker([start.lat, start.lng], { icon: routeIcon('A', 'start') })
        .bindPopup('Your starting point')
        .addTo(routeLayer)
      L.marker([end.lat, end.lng], { icon: routeIcon('B', 'end') })
        .bindPopup(directionsProject.value.title)
        .addTo(routeLayer)

      routeData.value = {
        distance: formatDistance(route.distance),
        duration: formatDuration(route.duration),
      }

      map.fitBounds(L.latLngBounds([[start.lat, start.lng], [end.lat, end.lng]]).pad(0.2), {
        maxZoom: 15,
      })
    } else {
      routeError.value =
        'A route could not be calculated between this location and the project. Try a different start point.'
    }
  } catch {
    routeError.value = "We couldn't reach the routing service. Please try again."
  } finally {
    routeComputing.value = false
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error('unsupported')
      error.code = 9
      reject(error)
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    })
  })
}

async function useMyLocation() {
  if (locating.value) return

  locating.value = true
  locationState.value = 'locating'
  locationMessage.value = 'Finding your current location…'

  try {
    const position = await getCurrentPosition()
    currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude }
    startPoint.value = null
    manualStartOpen.value = false
    locationState.value = 'success'
    locationMessage.value = ''
    if (directionsProject.value) await calculateRoute()
  } catch (error) {
    currentLocation = null
    if (!error || error.code === 1 || error.code === 9) {
      locationState.value = 'denied'
      locationMessage.value =
        error && error.code === 9
          ? 'Your browser does not support location services. You can enter a start point manually below.'
          : 'Location permission was denied. GreenLink still works — use the search to find the map, or enter a start point manually.'
    } else if (error.code === 2) {
      locationState.value = 'unavailable'
      locationMessage.value =
        "We couldn't determine your current location. You can still enter a start point manually below."
    } else {
      locationState.value = 'timeout'
      locationMessage.value = 'Finding your location took too long. Please try again.'
    }
  } finally {
    locating.value = false
  }
}

function openManualStart() {
  manualStartOpen.value = true
  manualError.value = ''
}

async function searchManualStart() {
  const query = manualQuery.value.trim()
  if (!query || manualSearching.value) return

  const seq = ++manualRequestSeq
  manualSearching.value = true
  manualError.value = ''

  try {
    const response = await fetch(nominatimUrl(query, 1), { headers: { Accept: 'application/json' } })
    const data = await response.json().catch(() => null)
    if (seq !== manualRequestSeq) return

    const place = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!place) {
      manualError.value = `No location found for "${query}".`
      return
    }

    startPoint.value = {
      lat: Number(place.lat),
      lng: Number(place.lon),
      label: place.display_name || query,
    }
    manualStartOpen.value = false
    manualQuery.value = ''
    if (directionsProject.value) await calculateRoute()
  } catch {
    if (seq !== manualRequestSeq) return
    manualError.value = 'Could not search for that location. Please try again.'
  } finally {
    if (seq === manualRequestSeq) manualSearching.value = false
  }
}

function clearStartPoint() {
  startPoint.value = null
  clearRoute()
}

function openDirections(project) {
  if (!project) return
  directionsProject.value = project
  directionsOpen.value = true
  routeError.value = ''
  routeData.value = null
  clearRoute()

  const marker = markersByProjectId.get(project.id)
  if (marker && map) {
    map.closePopup()
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true })
  }

  if (origin.value) {
    calculateRoute()
  }
}

function closeDirections() {
  directionsOpen.value = false
  directionsProject.value = null
  clearRoute()
}

function resetMap() {
  if (!map) return
  map.setView([props.center[0], props.center[1]], props.zoom)

  clearSelectedPlace()
  closeSearch()
  searchQuery.value = ''
  searchResults.value = []
  searchState.value = 'idle'
  searchMessage.value = ''

  closeDirections()
  currentLocation = null
  startPoint.value = null
  manualStartOpen.value = false
  manualQuery.value = ''
  manualError.value = ''
  manualSearching.value = false
  locationState.value = 'idle'
  locationMessage.value = ''

  if (markerLayer && mappableProjects.value.length > 0) {
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
    searchLayer = L.layerGroup().addTo(map)
    routeLayer = L.layerGroup().addTo(map)
    addMarkers()

    map.on('click', closeSearch)

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (map) map.invalidateSize()
      })
      resizeObserver.observe(mapContainer.value)
    }
    map.invalidateSize()
  } catch {
    hasMapFailed.value = true
  }
}

watch(
  () => props.projects,
  () => {
    if (map) addMarkers()
    if (directionsProject.value && !mappableProjects.value.some((p) => p.id === directionsProject.value.id)) {
      closeDirections()
    }
  },
  { deep: true },
)

watch(
  () => props.selectedProjectId,
  (id) => {
    if (id == null || !map) return
    const marker = markersByProjectId.get(id)
    if (marker) {
      marker.openPopup()
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13))
    }
  },
)

onMounted(initMap)

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (map) {
    map.remove()
    map = null
    markerLayer = null
    searchLayer = null
    routeLayer = null
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

      <div class="project-map__topbar">
        <form class="project-map__search" role="search" @submit.prevent="runSearch">
          <label class="sr-only" for="project-map-search">Search for a place</label>
          <input
            id="project-map-search"
            v-model="searchQuery"
            type="search"
            class="project-map__search-input"
            placeholder="Search Melbourne parks…"
            autocomplete="off"
            @keydown.esc="closeSearch"
          />
          <button
            type="submit"
            class="project-map__search-button"
            aria-label="Search places"
            :disabled="isSearching"
          >
            <AppIcon name="search" :size="18" />
          </button>

          <ul
            v-if="searchOpen && searchResults.length > 0"
            class="project-map__search-results"
            role="listbox"
            aria-label="Search results"
          >
            <li v-for="result in searchResults" :key="result.place_id" role="option">
              <button
                type="button"
                class="project-map__search-result"
                @mousedown.prevent
                @click="selectSearchResult(result)"
              >
                <span class="project-map__search-result-name">{{ result.display_name }}</span>
                <span class="project-map__search-result-type">{{ result.type || 'place' }}</span>
              </button>
            </li>
          </ul>

          <div
            v-if="searchState === 'empty' || searchState === 'error'"
            class="project-map__search-message"
            role="status"
          >
            {{ searchMessage }}
          </div>
        </form>

        <button type="button" class="project-map__reset" @click="resetMap">
          <AppIcon name="map-pin" :size="16" />
          Reset map
        </button>
      </div>

      <aside
        v-if="directionsOpen && directionsProject"
        class="project-map__directions"
        aria-label="Directions"
      >
        <header class="project-map__directions-header">
          <strong class="project-map__directions-title">Directions</strong>
          <button
            type="button"
            class="project-map__directions-close"
            aria-label="Close directions"
            @click="closeDirections"
          >
            <AppIcon name="close" :size="16" />
          </button>
        </header>

        <div class="project-map__directions-project">
          <strong>{{ directionsProject.title }}</strong>
          <span>{{ directionsProject.location }}</span>
        </div>

        <div v-if="!origin" class="project-map__directions-intro">
          <p>
            GreenLink uses your device location to show directions from where you are to this
            project. Your location is only read after you tap the button below.
          </p>
          <button
            type="button"
            class="project-map__directions-button"
            :disabled="locating"
            @click="useMyLocation"
          >
            <template v-if="locating">Finding location&hellip;</template>
            <template v-else><AppIcon name="map-pin" :size="16" /> Use my current location</template>
          </button>
          <p v-if="locationMessage" class="project-map__directions-message" role="status">
            {{ locationMessage }}
          </p>

          <div class="project-map__directions-divider">or</div>

          <button
            type="button"
            class="project-map__directions-link"
            @click="openManualStart"
          >
            Enter a start point instead
          </button>
        </div>

        <div v-else class="project-map__directions-origin">
          <div class="project-map__directions-row">
            <span class="project-map__directions-route-icon" aria-hidden="true">A</span>
            <span class="project-map__directions-route-label">{{ originLabel }}</span>
          </div>

          <div class="project-map__directions-actions">
            <button
              type="button"
              class="project-map__directions-link"
              :disabled="locating"
              @click="useMyLocation"
            >
              {{ currentLocation ? 'Refresh my location' : 'Use my current location' }}
            </button>
            <button
              type="button"
              class="project-map__directions-link"
              @click="clearStartPoint"
              v-if="startPoint"
            >
              Clear start point
            </button>
            <button
              type="button"
              class="project-map__directions-link"
              @click="manualStartOpen = !manualStartOpen"
            >
              {{ manualStartOpen ? 'Hide start search' : 'Change start point' }}
            </button>
          </div>
        </div>

        <form
          v-if="manualStartOpen"
          class="project-map__manual-start"
          @submit.prevent="searchManualStart"
        >
          <label class="sr-only" for="project-map-start-query">Search for a start address</label>
          <input
            id="project-map-start-query"
            v-model="manualQuery"
            type="search"
            placeholder="Search a street, suburb or landmark…"
            autocomplete="off"
          />
          <button
            type="submit"
            class="project-map__directions-button"
            :disabled="manualSearching"
          >
            <template v-if="manualSearching">Searching&hellip;</template>
            <template v-else>Set start</template>
          </button>
          <p v-if="manualError" class="project-map__directions-message" role="status">
            {{ manualError }}
          </p>
        </form>

        <div class="project-map__directions-results" aria-live="polite">
          <p v-if="routeComputing" class="project-map__directions-status">
            Calculating route&hellip;
          </p>
          <p v-else-if="routeError" class="project-map__directions-status project-map__directions-status--error" role="alert">
            {{ routeError }}
          </p>
          <dl v-else-if="routeData" class="project-map__route-summary">
            <div class="project-map__route-stat">
              <dt>Distance</dt>
              <dd>{{ routeData.distance }}</dd>
            </div>
            <div class="project-map__route-stat">
              <dt>Estimated travel time</dt>
              <dd>{{ routeData.duration }}</dd>
            </div>
          </dl>
          <button
            v-if="origin && !routeComputing"
            type="button"
            class="project-map__directions-link"
            @click="calculateRoute"
          >
            Recalculate route
          </button>
        </div>
      </aside>

      <p
        v-if="!directionsOpen && unmappedCount > 0"
        class="project-map__note"
      >
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
  min-height: 220px;
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
  z-index: 800;
  margin: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: rgb(255 255 255 / 0.92);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.project-map__topbar {
  position: absolute;
  top: 12px;
  left: 62px;
  right: 12px;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.project-map__topbar > * {
  pointer-events: auto;
}

.project-map__search {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  max-width: 360px;
}

.project-map__search-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 40px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.project-map__search-input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  z-index: 2;
}

.project-map__search-button {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-primary);
  border-left: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background-color: var(--color-primary);
  color: var(--color-surface);
  cursor: pointer;
}

.project-map__search-button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.project-map__search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.project-map__search-results {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  z-index: 1100;
  margin: 0;
  padding: var(--spacing-xs);
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md);
  max-height: 240px;
  overflow-y: auto;
}

.project-map__search-result {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.project-map__search-result:hover,
.project-map__search-result:focus-visible {
  background-color: var(--color-background);
}

.project-map__search-result-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.project-map__search-result-type {
  flex-shrink: 0;
  padding: 2px var(--spacing-xs);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}

.project-map__search-message {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  z-index: 1100;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.project-map__reset {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  height: 40px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: rgb(255 255 255 / 0.95);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.project-map__reset:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.project-map__directions {
  position: absolute;
  bottom: var(--spacing-sm);
  left: var(--spacing-sm);
  z-index: 900;
  width: min(340px, calc(100% - 96px));
  max-height: 48%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: rgb(255 255 255 / 0.96);
  box-shadow: var(--shadow-md);
}

.project-map__directions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-map__directions-title {
  font-size: var(--font-size-md);
}

.project-map__directions-close {
  display: grid;
  place-items: center;
  padding: var(--spacing-xs);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.project-map__directions-close:hover {
  color: var(--color-text);
}

.project-map__directions-project {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-sm);
}

.project-map__directions-project span {
  color: var(--color-text-secondary);
}

.project-map__directions-intro p {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.project-map__directions-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.project-map__directions-button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.project-map__directions-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.project-map__directions-message {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.project-map__directions-divider {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  margin-block: var(--spacing-xs);
}

.project-map__directions-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  cursor: pointer;
}

.project-map__directions-link:hover:not(:disabled) {
  color: var(--color-primary-dark);
}

.project-map__directions-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.project-map__directions-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.project-map__directions-origin {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.project-map__directions-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.project-map__directions-route-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.project-map__directions-route-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-map__manual-start {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.project-map__manual-start input {
  width: 100%;
  height: 40px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.project-map__manual-start input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
}

.project-map__directions-status {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.project-map__directions-status--error {
  color: var(--color-error);
}

.project-map__route-summary {
  display: flex;
  gap: var(--spacing-lg);
  margin: 0;
}

.project-map__route-stat {
  display: flex;
  flex-direction: column;
}

.project-map__route-stat dt {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.project-map__route-stat dd {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 480px) {
  .project-map__topbar {
    left: 54px;
    right: 8px;
    gap: var(--spacing-xs);
  }

  .project-map__reset {
    padding: 0 var(--spacing-sm);
  }

  .project-map__directions {
    width: calc(100% - 76px);
  }
}
</style>

<style>
.project-map :deep(.leaflet-popup-content-wrapper) {
  border-radius: var(--radius-md);
}

.project-map .project-map__popup {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.project-map .project-map__popup-title {
  font-size: 15px;
}

.project-map .project-map__popup-location {
  color: #5c6b60;
}

.project-map .project-map__popup-link {
  color: #2f6f4f;
  font-weight: 600;
  text-decoration: underline;
}

.project-map .project-map__popup-directions {
  margin-top: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background-color: #2f6f4f;
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.project-map .project-map__popup-directions:hover {
  background-color: #25583f;
}

.project-map .project-map__search-pin {
  background: transparent;
  border: none;
}

.project-map .project-map__search-pin span {
  display: block;
  width: 18px;
  height: 18px;
  border: 3px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  background-color: #1f7a5a;
  transform: rotate(-45deg);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
}

.project-map .project-map__route-icon {
  display: grid;
  place-items: center;
  border: 3px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
}

.project-map .project-map__route-icon span {
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.project-map .project-map__route-icon--start {
  background-color: #1f7a5a;
}

.project-map .project-map__route-icon--end {
  background-color: #2f6f4f;
}
</style>