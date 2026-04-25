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

// Convert score gap to an explainable confidence percentage.
function calculateConfidence(topScore, secondScore) {
  const safeTop = Number(topScore) || 0
  const safeSecond = Number(secondScore) || 0
  const gap = Math.max(0, safeTop - safeSecond)
  const confidence = 55 + Math.min(40, gap * 2.5)
  return Math.max(55, Math.min(95, Math.round(confidence)))
}

// Recalculate score after disabling one selected signal type.
function calculateSimulatedScore(signals, disabledSignal) {
  const weights = {
    messages: 8,
    notes: 6,
    sightings: 10,
    tipsHigh: 20,
    tipsMedium: 12,
    tipsLow: 6,
  }

  let score = 0
  if (disabledSignal !== 'messages') score += signals.messages * weights.messages
  if (disabledSignal !== 'notes') score += signals.notes * weights.notes
  if (disabledSignal !== 'sightings') score += signals.sightings * weights.sightings
  if (disabledSignal !== 'tips') {
    score += signals.tipsHigh * weights.tipsHigh
    score += signals.tipsMedium * weights.tipsMedium
    score += signals.tipsLow * weights.tipsLow
  }
  return score
}

// Build human-readable reasons from signal counters.
function buildReasonBullets(signals) {
  const bullets = []

  if (signals.tipsHigh > 0) {
    bullets.push(`Received ${signals.tipsHigh} high-confidence anonymous tip(s).`)
  }
  if (signals.sightings > 0) {
    bullets.push(`Appears in ${signals.sightings} sighting report(s).`)
  }
  if (signals.messages > 0) {
    bullets.push(`Linked to ${signals.messages} message record(s).`)
  }
  if (signals.notes > 0) {
    bullets.push(`Mentioned in ${signals.notes} personal note(s).`)
  }
  if (signals.tipsMedium + signals.tipsLow > 0) {
    bullets.push(
      `Has ${signals.tipsMedium + signals.tipsLow} additional medium/low confidence tip(s).`,
    )
  }

  return bullets.slice(0, 4)
}

// Render phase-2 prime suspect summary panel.
function PrimeSuspect({ searchTerm = '' }) {
  const [rankedSuspects, setRankedSuspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disabledSignal, setDisabledSignal] = useState('none')

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
  const secondSuspect = visibleSuspects[1]
  const topFive = visibleSuspects.slice(0, 5)

  // Simulate ranking impact when one signal type is removed.
  const simulatedTopFive = useMemo(() => {
    if (disabledSignal === 'none') return topFive

    return visibleSuspects
      .map((item) => ({
        ...item,
        simulatedScore: calculateSimulatedScore(item.signals, disabledSignal),
      }))
      .sort((a, b) => b.simulatedScore - a.simulatedScore)
      .slice(0, 5)
  }, [visibleSuspects, disabledSignal, topFive])

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
      <h2 className="text-2xl font-semibold text-red-300">Prime Suspect (Phase 2)</h2>
      {!topSuspect ? (
        <p className="mt-3 text-slate-300">No suspect found for this search.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-red-300/30 bg-red-400/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-wider text-red-200">Top Candidate</p>
                <p className="mt-1 text-2xl font-bold text-amber-200">{topSuspect.name}</p>
              </div>
              <div className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wider text-amber-100">Confidence</p>
                <p className="text-xl font-semibold text-amber-200">
                  {calculateConfidence(topSuspect.score, secondSuspect?.score)}%
                </p>
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-200">Suspicion Score: {topSuspect.score}</p>
            <p className="mt-2 text-xs text-slate-300">
              Signals - M:{topSuspect.signals.messages} N:{topSuspect.signals.notes} S:
              {topSuspect.signals.sightings} T:
              {topSuspect.signals.tipsHigh + topSuspect.signals.tipsMedium + topSuspect.signals.tipsLow}
            </p>

            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-slate-300">Why this suspect?</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                {buildReasonBullets(topSuspect.signals).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Show top-5 ranking to compare leading suspects quickly. */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-300">Top 5 Ranking</p>
            <ul className="mt-2 space-y-2">
              {topFive.map((item, idx) => (
                <li
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="text-sm font-semibold text-amber-200">{item.score}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Let judges test how ranking changes without one signal type. */}
          <div className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-wider text-cyan-200">Impact Simulation</p>
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="impact-signal" className="text-sm text-slate-200">
                Disable signal:
              </label>
              <select
                id="impact-signal"
                value={disabledSignal}
                onChange={(event) => setDisabledSignal(event.target.value)}
                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              >
                <option value="none">None</option>
                <option value="messages">Messages</option>
                <option value="notes">Personal Notes</option>
                <option value="sightings">Sightings</option>
                <option value="tips">Anonymous Tips</option>
              </select>
            </div>

            <ul className="mt-3 space-y-2">
              {simulatedTopFive.map((item, idx) => (
                <li
                  key={`sim-${item.name}-${idx}`}
                  className="flex items-center justify-between rounded border border-cyan-300/20 bg-slate-900/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="text-sm font-semibold text-cyan-200">
                    {disabledSignal === 'none' ? item.score : item.simulatedScore}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

export default PrimeSuspect
