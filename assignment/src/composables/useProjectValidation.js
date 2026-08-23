import { reactive, watch } from 'vue'

const TITLE_MAX = 160
const LOCATION_MAX = 160
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 2000

export const PROJECT_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function createEmptyProjectForm() {
  return {
    title: '',
    description: '',
    categoryId: '',
    location: '',
    latitude: '',
    longitude: '',
    image: '',
    startDate: '',
    endDate: '',
    capacity: '',
    status: 'planned',
  }
}

export function useProjectValidation(form) {
  const errors = reactive({})

  function clearErrors() {
    Object.keys(errors).forEach((key) => delete errors[key])
  }

  function applyServerErrors(serverErrors) {
    clearErrors()
    Object.assign(errors, serverErrors)
  }

  watch(form, (next, previous) => {
    for (const key of Object.keys(next)) {
      if (next[key] !== previous[key]) {
        delete errors[key]
      }
    }
  })

  function validate() {
    clearErrors()
    const next = {}

    const title = form.title.trim()
    if (!title) {
      next.title = 'Project title is required.'
    } else if (title.length > TITLE_MAX) {
      next.title = `Project title must be ${TITLE_MAX} characters or fewer.`
    }

    const description = form.description.trim()
    if (!description) {
      next.description = 'Please describe what volunteers will do in this project.'
    } else if (description.length < DESCRIPTION_MIN) {
      next.description = `Description must be at least ${DESCRIPTION_MIN} characters.`
    } else if (description.length > DESCRIPTION_MAX) {
      next.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`
    }

    if (!form.categoryId) {
      next.categoryId = 'Please choose a category.'
    }

    const location = form.location.trim()
    if (!location) {
      next.location = 'Location is required, e.g. "Royal Park, Parkville".'
    } else if (location.length > LOCATION_MAX) {
      next.location = `Location must be ${LOCATION_MAX} characters or fewer.`
    }

    const latitude = Number(form.latitude)
    if (form.latitude === '' || !Number.isFinite(latitude)) {
      next.latitude = 'Latitude must be a number, e.g. -37.8515.'
    } else if (latitude < -90 || latitude > 90) {
      next.latitude = 'Latitude must be between -90 and 90.'
    }

    const longitude = Number(form.longitude)
    if (form.longitude === '' || !Number.isFinite(longitude)) {
      next.longitude = 'Longitude must be a number, e.g. 144.9510.'
    } else if (longitude < -180 || longitude > 180) {
      next.longitude = 'Longitude must be between -180 and 180.'
    }

    const image = form.image.trim()
    if (image && !/^https?:\/\//.test(image) && !image.startsWith('/')) {
      next.image = 'Image must be an http(s) URL or a path starting with "/".'
    }

    if (!form.startDate) {
      next.startDate = 'Start date is required.'
    }

    if (!form.endDate) {
      next.endDate = 'End date is required.'
    } else if (form.startDate && form.endDate < form.startDate) {
      next.endDate = "End date can't be before the start date."
    }

    const capacity = Number(form.capacity)
    if (form.capacity === '' || !Number.isInteger(capacity) || capacity <= 0) {
      next.capacity = 'Capacity must be a whole number greater than zero.'
    }

    Object.assign(errors, next)
    return Object.keys(next).length === 0
  }

  return { errors, validate, clearErrors, applyServerErrors }
}
