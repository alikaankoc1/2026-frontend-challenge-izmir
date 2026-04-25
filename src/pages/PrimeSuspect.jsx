import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize names to merge case and Turkish character variants.
function normalizeName(name) {
  return String(name ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Create a field map from Jotform answers.
function toFieldMap(answers) {
  return Object.fromEntries(
    Object.values(answers ?? {}).map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )
}

// Calculate a weighted suspicion score for each suspect.
function calculateScores({ messages, notes, sightings, tips }) {
  const scores = new Map()

  const ensure = (key, displayName = 'Unknown') => {
    if (!scores.has(key)) {
      scores.set(key, {
        name: displayName,
        score: 0,
        signals: { messages: 0, notes: 0, sightings: 0, tipsHigh: 0, tipsMedium: 0, tipsLow: 0 },
      })
    }
    return scores.get(key)
  }

  messages.forEach((answers) => {
    const fields = toFieldMap(answers)
    const name = String(fields.from?.answer ?? 'Unknown')
    const key = normalizeName(name)
    if (!key) return
    const item = ensure(key, name)
    item.signals.messages += 1
    item.score += 8
  })

  notes.forEach((answers) => {
    const fields = toFieldMap(answers)
    const name = String(fields.fullname?.answer ?? 'Unknown')
    const key = normalizeName(name)
    if (!key) return
    const item = ensure(key, name)
    item.signals.notes += 1
    item.score += 6
  })

  sightings.forEach((answers) => {
    const fields = toFieldMap(answers)
    const name = String(fields.personname?.answer ?? 'Unknown')
    const key = normalizeName(name)
    if (!key) return
    const item = ensure(key, name)
    item.signals.sightings += 1
    item.score += 10
  })

  tips.forEach((answers) => {
    const fields = toFieldMap(answers)
    const name = String(fields.suspectname?.answer ?? 'Unknown')
    const key = normalizeName(name)
    if (!key) return
    const item = ensure(key, name)
    const confidence = String(fields.confidence?.answer ?? 'low').toLocaleLowerCase('tr-TR')

    if (confidence === 'high') {
      item.signals.tipsHigh += 1
      item.score += 20
    } else if (confidence === 'medium') {
      item.signals.tipsMedium += 1
      item.score += 12
    } else {
      item.signals.tipsLow += 1
      item.score += 6
    }
  })

  return Array.from(scores.values()).sort((a, b) => b.score - a.score)
}

// Render phase-1 prime suspect summary panel.
function PrimeSuspect({ searchTerm = '' }) {
  const [rankedSuspects, setRankedSuspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch all relevant forms for the initial prime suspect calculation.
    const loadPrimeSuspect = async () => {
      try {
        const [messages, notes, sightings, tips] = await Promise.all([
          getSubmissions(FORM_IDS.MESSAGES),
          getSubmissions(FORM_IDS.PERSONAL_NOTES),
          getSubmissions(FORM_IDS.SIGHTINGS),
          getSubmissions(FORM_IDS.ANONYMOUS_TIPS),
        ])

        setRankedSuspects(calculateScores({ messages, notes, sightings, tips }))
      } catch (requestError) {
        setError('Failed to calculate prime suspect.')
        console.error('Prime suspect request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadPrimeSuspect()
  }, [])

  // Keep global search support consistent with other pages.
  const visibleSuspects = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR')
    if (!query) return rankedSuspects
    return rankedSuspects.filter((item) => item.name.toLocaleLowerCase('tr-TR').includes(query))
  }, [rankedSuspects, searchTerm])

  const topSuspect = visibleSuspects[0]

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-emerald-300">Calculating prime suspect...</p>
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
    <section className="rounded-xl border border-red-400/30 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <h2 className="text-2xl font-semibold text-red-300">Prime Suspect (Phase 1)</h2>
      {!topSuspect ? (
        <p className="mt-3 text-slate-300">No suspect found for this search.</p>
      ) : (
        <div className="mt-4 rounded-lg border border-red-300/30 bg-red-400/10 p-4">
          <p className="text-sm uppercase tracking-wider text-red-200">Top Candidate</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{topSuspect.name}</p>
          <p className="mt-2 text-sm text-slate-200">Suspicion Score: {topSuspect.score}</p>
          <p className="mt-2 text-xs text-slate-300">
            Signals - M:{topSuspect.signals.messages} N:{topSuspect.signals.notes} S:
            {topSuspect.signals.sightings} T:
            {topSuspect.signals.tipsHigh + topSuspect.signals.tipsMedium + topSuspect.signals.tipsLow}
          </p>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Next phase: add explainable reason bullets and confidence percentage.
      </p>
    </section>
  )
}

export default PrimeSuspect
