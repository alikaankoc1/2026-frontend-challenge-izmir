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
    checkinTime: String(byFieldName.timestamp?.answer ?? 'Unknown'),
    note: String(byFieldName.note?.answer ?? '-'),
    location: String(byFieldName.location?.answer ?? 'Unknown'),
  }
}

// Normalize Sightings form answers into a simple list row.
function mapSightingAnswerToRow(answers, index) {
  const answerList = Object.values(answers ?? {})
  const byFieldName = Object.fromEntries(
    answerList.map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )

  return {
    id: index + 1,
    location: String(byFieldName.location?.answer ?? 'Unknown'),
    timestamp: String(byFieldName.timestamp?.answer ?? 'Unknown'),
    note: String(byFieldName.note?.answer ?? '-'),
  }
}

function Dashboard() {
  const [checkins, setCheckins] = useState([])
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch dashboard records from CHECKINS and SIGHTINGS forms.
    const loadDashboardData = async () => {
      try {
        const [checkinAnswers, sightingAnswers] = await Promise.all([
          getSubmissions(FORM_IDS.CHECKINS),
          getSubmissions(FORM_IDS.SIGHTINGS),
        ])

        setCheckins(checkinAnswers.map(mapCheckinAnswerToRow))
        setSightings(sightingAnswers.map(mapSightingAnswerToRow))
      } catch (requestError) {
        setError('Failed to load dashboard records.')
        console.error('Dashboard requests failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Match common Izmir locations used in check-in records.
  const izmirKeywords = [
    'izmir',
    'konak',
    'alsancak',
    'karsiyaka',
    'karşıyaka',
    'bornova',
    'bostanli',
    'bostanlı',
  ]

  // Keep only attendees that checked in from Izmir.
  const izmirCheckins = useMemo(
    () =>
      checkins.filter((row) =>
        izmirKeywords.some((keyword) =>
          String(row.location).toLocaleLowerCase('tr-TR').includes(keyword),
        ),
      ),
    [checkins],
  )

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <div className="flex items-center gap-4">
          {/* Animated scanner icon for detective-style loading state. */}
          <div className="relative h-10 w-10">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30" />
            <span className="absolute inset-1 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-emerald-300">Loading...</p>
            <p className="text-sm text-slate-400">Evidence records are being scanned.</p>
          </div>
        </div>
        {/* Pulsing progress bars for extra motion feedback. */}
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full animate-pulse rounded bg-emerald-400/20" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-amber-300/20" />
        </div>
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
    <div className="space-y-6">
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
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-300">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-300">
                    Suspect Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-300">
                    Check-in Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-300">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                {izmirCheckins.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm text-slate-300">{row.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-200">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-emerald-300">{row.checkinTime}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{row.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-emerald-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-semibold text-emerald-300">Sightings</h2>
          <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm text-amber-200">
            Total: {sightings.length}
          </span>
        </div>

        {sightings.length === 0 ? (
          <p className="text-slate-300">No sightings records found yet.</p>
        ) : (
          <ul className="space-y-3">
            {sightings.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-700 bg-slate-800/70 p-4"
              >
                <p className="text-sm text-slate-300">
                  <span className="text-slate-400">Görüldüğü Yer:</span> {item.location}
                </p>
                <p className="mt-1 text-sm text-emerald-300">
                  <span className="text-slate-400">Zaman:</span> {item.timestamp}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  <span className="text-slate-400">Tanım / Not:</span> {item.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
