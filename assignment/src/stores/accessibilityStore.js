import { reactive, watch } from 'vue'

const STORAGE_KEY = 'greenlink:accessibility'

const TEXT_SIZE_CLASSES = {
  large: 'a11y-text-large',
  xlarge: 'a11y-text-xlarge',
}

const settings = reactive({
  textSize: 'default',
  highContrast: false,
  underlineLinks: false,
  reduceMotion: false,
})

let initialized = false

// Loads saved accessibility settings.
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    // Ignore unsupported text sizes.
    if (['default', 'large', 'xlarge'].includes(parsed.textSize)) {
      settings.textSize = parsed.textSize
    }
    settings.highContrast = Boolean(parsed.highContrast)
    settings.underlineLinks = Boolean(parsed.underlineLinks)
    settings.reduceMotion = Boolean(parsed.reduceMotion)
  } catch {
    // Ignore malformed or unavailable storage.
  }
}

// Saves accessibility settings.
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings }))
  } catch {
    // Ignore storage write failures (e.g. private mode).
  }
}

// Applies settings to the page.
function apply() {
  const root = document.documentElement
  // Apply preferences globally.
  Object.values(TEXT_SIZE_CLASSES).forEach((className) => root.classList.remove(className))
  if (TEXT_SIZE_CLASSES[settings.textSize]) {
    root.classList.add(TEXT_SIZE_CLASSES[settings.textSize])
  }
  root.classList.toggle('a11y-contrast', settings.highContrast)
  root.classList.toggle('a11y-underline-links', settings.underlineLinks)
  root.classList.toggle('a11y-reduce-motion', settings.reduceMotion)
}

// Initializes settings and change tracking.
function init() {
  if (initialized) return
  initialized = true
  load()
  apply()
  // Saves and applies later setting changes.
  watch(settings, () => {
    apply()
    persist()
  })
}

// Sets the page text size.
function setTextSize(value) {
  if (['default', 'large', 'xlarge'].includes(value)) settings.textSize = value
}

// Toggles a display setting.
function toggle(key) {
  if (key in settings && typeof settings[key] === 'boolean') {
    settings[key] = !settings[key]
  }
}

// Restores default accessibility settings.
function reset() {
  settings.textSize = 'default'
  settings.highContrast = false
  settings.underlineLinks = false
  settings.reduceMotion = false
}

// Exposes accessibility settings and actions.
export function useAccessibilityStore() {
  return { settings, init, setTextSize, toggle, reset }
}
