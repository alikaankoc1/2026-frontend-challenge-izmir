import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize Checkins form answers into a list row.
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
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-emerald-300">Loading check-in data...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-rose-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-rose-300">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-amber-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-amber-300">İzmir Partisi Giriş Kayıtları</h2>
        <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
          Total: {izmirCheckins.length}
        </span>
      </div>

      {izmirCheckins.length === 0 ? (
        <p className="text-slate-300">No Izmir check-ins found yet.</p>
      ) : (
        <ul className="space-y-3">
          {izmirCheckins.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 transition hover:border-amber-300/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-medium text-amber-200">{row.name}</p>
                <p className="text-sm text-emerald-300">{row.checkinTime}</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                <span className="text-slate-400">Location:</span> {row.location}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                <span className="text-slate-400">Note:</span> {row.note || '-'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Dashboard
