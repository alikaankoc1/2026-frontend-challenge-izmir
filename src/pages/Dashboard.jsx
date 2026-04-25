import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize raw Jotform answers into a list row.
function mapCheckinAnswerToRow(answers, index) {
  const answerList = Object.values(answers ?? {})

  const findByQuestion = (patterns) =>
    answerList.find((item) =>
      patterns.some((pattern) =>
        String(item?.text ?? '')
          .toLowerCase()
          .includes(pattern),
      ),
    )

  const nameField = findByQuestion(['name', 'full name', 'ad', 'isim', 'soyad'])
  const cityField = findByQuestion(['city', 'şehir', 'sehir', 'location', 'konum'])
  const timeField = findByQuestion(['time', 'saat', 'date', 'tarih'])

  return {
    id: index + 1,
    name: String(nameField?.answer ?? 'Unknown'),
    city: String(cityField?.answer ?? 'Unknown'),
    checkinTime: String(timeField?.answer ?? 'Unknown'),
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
        String(row.city).toLocaleLowerCase('tr-TR').includes('izmir'),
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
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>City</th>
            <th>Check-in Time</th>
          </tr>
        </thead>
        <tbody>
          {izmirCheckins.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.city}</td>
              <td>{row.checkinTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default Dashboard
