import { useEffect } from 'react'
import { FORM_IDS, getSubmissions } from './services/jotformService'

// Render a single title and test service calls in console.
function App() {
  useEffect(() => {
    // Run service tests when the app mounts.
    const testService = async () => {
      try {
        const [checkins, messages, sightings] = await Promise.all([
          getSubmissions(FORM_IDS.CHECKINS),
          getSubmissions(FORM_IDS.MESSAGES),
          getSubmissions(FORM_IDS.SIGHTINGS),
        ])

        // Log results for quick integration verification.
        console.log('CHECKINS answers:', checkins)
        console.log('MESSAGES answers:', messages)
        console.log('SIGHTINGS answers:', sightings)
      } catch (error) {
        // Log any API or network failure details.
        console.error('Jotform service test failed:', error)
      }
    }

    testService()
  }, [])

  return <h1>Podo Search: Izmir Mystery</h1>
}

export default App
