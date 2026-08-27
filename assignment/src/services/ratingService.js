import { apiRequest } from './api'

export async function getProjectRatings(projectId) {
  return apiRequest(`/api/projects/${projectId}/ratings`)
}

export async function submitRating(projectId, rating) {
  return apiRequest(`/api/projects/${projectId}/ratings`, {
    method: 'POST',
    body: rating,
  })
}

export async function updateRating(projectId, ratingId, rating) {
  return apiRequest(`/api/projects/${projectId}/ratings/${ratingId}`, {
    method: 'PUT',
    body: rating,
  })
}

export async function deleteRating(projectId, ratingId) {
  return apiRequest(`/api/projects/${projectId}/ratings/${ratingId}`, {
    method: 'DELETE',
  })
}
