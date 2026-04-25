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

// Normalize Turkish characters and trailing repeats for stable name matching.
function normalizeNameForKey(name) {
  return String(name)
    .toLocaleLowerCase('tr-TR')
    // Unify Turkish dotless/dotted i variants before cleanup.
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(.)\1+$/g, '$1')
}

// Format suspect names in a consistent title-case style.
function formatDisplayName(name) {
  return String(name)
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1))
    .join(' ')
}

// Pick the stronger confidence level when merging duplicate suspects.
function pickHigherConfidence(a, b) {
  const rank = { low: 1, medium: 2, high: 3 }
  const safeA = String(a).toLocaleLowerCase('tr-TR')
  const safeB = String(b).toLocaleLowerCase('tr-TR')
  return (rank[safeB] ?? 0) >= (rank[safeA] ?? 0) ? b : a
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
        const rows = answers.map(mapTipAnswerToRow)

        // Merge duplicated suspect names after normalization.
        const merged = new Map()
        rows.forEach((row) => {
          const key = normalizeNameForKey(row.suspectName)
          const existing = merged.get(key)

          if (!existing) {
            merged.set(key, {
              ...row,
              suspectName: formatDisplayName(row.suspectName),
            })
            return
          }

          merged.set(key, {
            ...existing,
            suspectName:
              existing.suspectName && existing.suspectName !== 'Unknown'
                ? existing.suspectName
                : formatDisplayName(row.suspectName),
            // Keep richer values while combining duplicate tips.
            location: row.location !== 'Unknown' ? row.location : existing.location,
            timestamp: row.timestamp !== 'Unknown' ? row.timestamp : existing.timestamp,
            tip:
              row.tip && row.tip !== '-' && row.tip !== existing.tip
                ? `${existing.tip} | ${row.tip}`
                : existing.tip,
            confidence: pickHigherConfidence(existing.confidence, row.confidence),
          })
        })

        setTips(Array.from(merged.values()))
      } catch (requestError) {
        setError('Failed to load anonymous tips.')
        console.error('Anonymous tips request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadTips()
  }, [])

  // Keep cards sorted alphabetically for easier scanning.
  const orderedTips = useMemo(
    () =>
      [...tips].sort((a, b) =>
        String(a.suspectName).localeCompare(String(b.suspectName), 'tr', {
          sensitivity: 'base',
        }),
      ),
    [tips],
  )

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
