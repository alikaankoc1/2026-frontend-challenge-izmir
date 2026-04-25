import axios from 'axios'

// Keep all Jotform form IDs in one place.
export const FORM_IDS = {
  CHECKINS: '261134527667966',
  MESSAGES: '261133651963962',
  SIGHTINGS: '261133720555956',
}

// Create a single axios client for every Jotform request.
const jotformApi = axios.create({
  baseURL: 'https://api.jotform.com',
  params: {
    apiKey: import.meta.env.VITE_JOTFORM_API_KEY,
  },
})

// Fetch submissions for a form and return only answer payloads.
export async function getSubmissions(formId) {
  const response = await jotformApi.get(`/form/${formId}/submissions`)
  const submissions = response?.data?.content ?? []

  return submissions.map((submission) => submission.answers)
}
