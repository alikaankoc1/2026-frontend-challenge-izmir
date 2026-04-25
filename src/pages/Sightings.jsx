import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

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

// Render a dedicated Sightings page with real Jotform data.
function Sightings({ searchTerm = '' }) {
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch sightings records from the SIGHTINGS form.
    const loadSightings = async () => {
      try {
        const answers = await getSubmissions(FORM_IDS.SIGHTINGS)
        setSightings(answers.map(mapSightingAnswerToRow))
      } catch (requestError) {
        setError('Failed to load sightings records.')
        console.error('Sightings request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadSightings()
  }, [])

  // Apply global text filtering across location, time, and note fields.
  const visibleSightings = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR')
    if (!query) return sightings

    return sightings.filter((item) =>
      [item.location, item.timestamp, item.note]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(query),
    )
  }, [sightings, searchTerm])

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-emerald-300">Loading sightings...</p>
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
    <section className="rounded-xl border border-emerald-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-emerald-300">Sightings</h2>
        <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm text-amber-200">
          Total: {visibleSightings.length}
        </span>
      </div>

      {visibleSightings.length === 0 ? (
        <p className="text-slate-300">No sightings records found yet.</p>
      ) : (
        <ul className="space-y-3">
          {visibleSightings.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
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
  )
}

export default Sightings
