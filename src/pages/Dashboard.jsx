import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize Checkins form answers into a table row.
function mapCheckinAnswerToRow(answers, index) {
  const answerList = Object.values(answers ?? {})
  const byFieldName = Object.fromEntries(
    answerList.map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )

  return {
    id: index + 1,
    name: String(byFieldName.fullname?.answer ?? 'Unknown'),
    location: String(byFieldName.location?.answer ?? 'Unknown'),
    coordinates: String(byFieldName.coordinates?.answer ?? 'Unknown'),
    checkinTime: String(byFieldName.timestamp?.answer ?? 'Unknown'),
    note: String(byFieldName.note?.answer ?? '-'),
  }
}

function Dashboard() {
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch check-in records from the CHECKINS form.
    const loadCheckins = async () => {
      try {
        const answers = await getSubmissions(FORM_IDS.CHECKINS)
        const rows = answers.map(mapCheckinAnswerToRow)
        setCheckins(rows)
      } catch (requestError) {
        setError('Failed to load check-in records.')
        console.error('Check-ins request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadCheckins()
  }, [])

  // Keep only attendees that checked in from Izmir.
  const izmirCheckins = useMemo(
    () =>
      checkins.filter((row) =>
        String(row.location).toLocaleLowerCase('tr-TR').includes('izmir'),
      ),
    [checkins],
  )

  if (loading) {
    return <p>Loading check-in data...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  return (
    <section>
      <h2>Check-ins in Izmir</h2>
      <p>Total entries: {izmirCheckins.length}</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Location</th>
            <th>Coordinates</th>
            <th>Check-in Time</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {izmirCheckins.length === 0 && (
            <tr>
              <td colSpan={6}>No Izmir check-ins found yet.</td>
            </tr>
          )}
          {izmirCheckins.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.location}</td>
              <td>{row.coordinates}</td>
              <td>{row.checkinTime}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default Dashboard
