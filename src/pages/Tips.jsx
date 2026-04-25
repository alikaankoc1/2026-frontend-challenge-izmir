import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize Anonymous Tips answers into a card-friendly shape.
function mapTipAnswerToRow(answers, index) {
  const fields = Object.fromEntries(
    Object.values(answers ?? {}).map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )

  return {
    id: index + 1,
    suspectName: String(fields.suspectname?.answer ?? 'Unknown'),
    location: String(fields.location?.answer ?? 'Unknown'),
    timestamp: String(fields.timestamp?.answer ?? 'Unknown'),
    tip: String(fields.tip?.answer ?? '-'),
    confidence: String(fields.confidence?.answer ?? 'unknown'),
  }
}

// Render Anonymous Tips in the same visual language as other pages.
function Tips() {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch tip records from the Anonymous Tips form.
    const loadTips = async () => {
      try {
        const answers = await getSubmissions(FORM_IDS.ANONYMOUS_TIPS)
        setTips(answers.map(mapTipAnswerToRow))
      } catch (requestError) {
        setError('Failed to load anonymous tips.')
        console.error('Anonymous tips request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadTips()
  }, [])

  // Keep newest-looking rows near the top by insertion order.
  const orderedTips = useMemo(() => [...tips], [tips])

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
        <p className="text-emerald-300">Loading anonymous tips...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-rose-500/30 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
        <p className="text-rose-300">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-amber-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-amber-300">Anonymous Tips</h2>
        <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
          Total: {orderedTips.length}
        </span>
      </div>

      {orderedTips.length === 0 ? (
        <p className="text-slate-300">No anonymous tips found yet.</p>
      ) : (
        <ul className="space-y-3">
          {orderedTips.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 transition hover:border-amber-300/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-amber-200">Suspect: {item.suspectName}</p>
                <p className="text-xs uppercase tracking-wider text-emerald-300">
                  Confidence: {item.confidence}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                <span className="text-slate-400">Location:</span> {item.location}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                <span className="text-slate-400">Time:</span> {item.timestamp}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                <span className="text-slate-400">Tip:</span> {item.tip}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Tips
