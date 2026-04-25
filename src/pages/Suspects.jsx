import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Build a quick lookup map from answer text keys.
function createAnswerMap(answers) {
  return Object.fromEntries(
    Object.values(answers ?? {}).map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )
}

// Convert form answers into a normalized suspect profile candidate.
function mapToSuspectProfile(answers, source) {
  const fields = createAnswerMap(answers)

  if (source === 'messages') {
    return {
      name: String(fields.from?.answer ?? 'Unknown'),
      timestamp: String(fields.timestamp?.answer ?? 'Unknown'),
      note: String(fields.message?.answer ?? '-'),
      source: 'Messages',
    }
  }

  return {
    name: String(fields.fullname?.answer ?? 'Unknown'),
    timestamp: String(fields.timestamp?.answer ?? 'Unknown'),
    note: String(fields.note?.answer ?? '-'),
    source: 'Personal Notes',
  }
}

// Return initials to use inside placeholder avatar circles.
function getInitials(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// Build a deterministic avatar URL so each suspect keeps a stable image.
function getSuspectImageUrl(name) {
  const seed = encodeURIComponent(String(name || 'unknown'))
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=1e293b,0f172a,334155`
}

// Normalize Turkish characters and letter repeats for stable name matching.
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

// Format names in a consistent title-case style for UI.
function formatDisplayName(name) {
  return String(name)
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1))
    .join(' ')
}

// Build suspicion signals from related forms for each suspect key.
function buildSuspicionSignals({ messageAnswers, noteAnswers, sightingAnswers, tipAnswers }) {
  const signals = new Map()

  const ensureSignal = (key) => {
    if (!signals.has(key)) {
      signals.set(key, {
        messages: 0,
        notes: 0,
        sightings: 0,
        tipsLow: 0,
        tipsMedium: 0,
        tipsHigh: 0,
      })
    }
    return signals.get(key)
  }

  // Count message participation by sender name.
  messageAnswers.forEach((answers) => {
    const fields = createAnswerMap(answers)
    const key = normalizeNameForKey(fields.from?.answer ?? '')
    if (!key || key === 'unknown') return
    ensureSignal(key).messages += 1
  })

  // Count personal notes by full name.
  noteAnswers.forEach((answers) => {
    const fields = createAnswerMap(answers)
    const key = normalizeNameForKey(fields.fullname?.answer ?? '')
    if (!key || key === 'unknown') return
    ensureSignal(key).notes += 1
  })

  // Count sightings by person name.
  sightingAnswers.forEach((answers) => {
    const fields = createAnswerMap(answers)
    const key = normalizeNameForKey(fields.personname?.answer ?? '')
    if (!key || key === 'unknown') return
    ensureSignal(key).sightings += 1
  })

  // Weight anonymous tips by confidence level.
  tipAnswers.forEach((answers) => {
    const fields = createAnswerMap(answers)
    const key = normalizeNameForKey(fields.suspectname?.answer ?? '')
    if (!key || key === 'unknown') return

    const confidence = String(fields.confidence?.answer ?? 'low').toLocaleLowerCase('tr-TR')
    const signal = ensureSignal(key)

    if (confidence === 'high') signal.tipsHigh += 1
    else if (confidence === 'medium') signal.tipsMedium += 1
    else signal.tipsLow += 1
  })

  return signals
}

// Convert signal counters into a readable score from 0 to 100.
function calculateSuspicionScore(signal) {
  const rawScore =
    signal.messages * 8 +
    signal.notes * 6 +
    signal.sightings * 10 +
    signal.tipsLow * 6 +
    signal.tipsMedium * 12 +
    signal.tipsHigh * 20

  return Math.max(0, Math.min(100, rawScore))
}

// Convert score to a green->red color scale.
function getScoreHue(score) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0))
  return 120 - (clamped / 100) * 120
}

// Build dynamic badge colors from the suspicion score.
function getScoreBadgeStyle(score) {
  const hue = getScoreHue(score)
  return {
    borderColor: `hsl(${hue} 80% 45% / 0.55)`,
    backgroundColor: `hsl(${hue} 80% 45% / 0.16)`,
    color: `hsl(${hue} 88% 72%)`,
  }
}

// Build subtle card accent colors from the suspicion score.
function getScoreCardStyle(score) {
  const hue = getScoreHue(score)
  return {
    borderColor: `hsl(${hue} 75% 40% / 0.35)`,
    boxShadow: `inset 0 0 0 1px hsl(${hue} 75% 40% / 0.14)`,
  }
}

// Render suspect cards sourced from real Jotform forms.
function Suspects({ searchTerm = '' }) {
  const [suspects, setSuspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch suspect-related records from Messages and Personal Notes.
    const loadSuspects = async () => {
      try {
        const [messageAnswers, noteAnswers, sightingAnswers, tipAnswers] = await Promise.all([
          getSubmissions(FORM_IDS.MESSAGES),
          getSubmissions(FORM_IDS.PERSONAL_NOTES),
          getSubmissions(FORM_IDS.SIGHTINGS),
          getSubmissions(FORM_IDS.ANONYMOUS_TIPS),
        ])

        const messageProfiles = messageAnswers.map((answers) =>
          mapToSuspectProfile(answers, 'messages'),
        )
        const noteProfiles = noteAnswers.map((answers) => mapToSuspectProfile(answers, 'notes'))
        const suspicionSignals = buildSuspicionSignals({
          messageAnswers,
          noteAnswers,
          sightingAnswers,
          tipAnswers,
        })

        // Merge duplicate names and keep the latest non-empty details.
        const merged = new Map()
        ;[...messageProfiles, ...noteProfiles].forEach((profile) => {
          const key = normalizeNameForKey(profile.name)
          const existing = merged.get(key)

          if (!existing) {
            merged.set(key, {
              ...profile,
              name: formatDisplayName(profile.name),
              sources: new Set([profile.source]),
            })
            return
          }

          const sourceSet = new Set(existing.sources)
          sourceSet.add(profile.source)

          merged.set(key, {
            ...existing,
            name:
              existing.name && existing.name !== 'Unknown'
                ? existing.name
                : formatDisplayName(profile.name),
            timestamp: profile.timestamp !== 'Unknown' ? profile.timestamp : existing.timestamp,
            note: profile.note !== '-' ? profile.note : existing.note,
            sources: sourceSet,
          })
        })

        // Convert source sets to a stable joined label for rendering.
        const normalizedSuspects = Array.from(merged.values()).map((item) => {
          const key = normalizeNameForKey(item.name)
          const signal = suspicionSignals.get(key) ?? {
            messages: 0,
            notes: 0,
            sightings: 0,
            tipsLow: 0,
            tipsMedium: 0,
            tipsHigh: 0,
          }

          return {
            ...item,
            source: Array.from(item.sources).join(' + '),
            suspicionScore: calculateSuspicionScore(signal),
            signalSummary: `M:${signal.messages} N:${signal.notes} S:${signal.sightings} T:${signal.tipsHigh + signal.tipsMedium + signal.tipsLow}`,
          }
        })

        setSuspects(normalizedSuspects)
      } catch (requestError) {
        setError('Failed to load suspect profiles.')
        console.error('Suspects request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadSuspects()
  }, [])

  // Keep cards sorted alphabetically for easier scanning.
  const sortedSuspects = useMemo(
    () =>
      [...suspects].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'tr', { sensitivity: 'base' }),
      ),
    [suspects],
  )

  // Apply global text filtering across suspect card fields.
  const visibleSuspects = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR')
    if (!query) return sortedSuspects

    return sortedSuspects.filter((suspect) =>
      [suspect.name, suspect.timestamp, suspect.note, suspect.source]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(query),
    )
  }, [sortedSuspects, searchTerm])

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
        <p className="text-emerald-300">Loading suspect profiles...</p>
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
      <div className="mb-5 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-amber-300">Suspects</h2>
        <p className="mt-2 text-sm text-slate-400">
          Profiles are mapped from Messages and Personal Notes records.
        </p>
      </div>

      {visibleSuspects.length === 0 ? (
        <p className="text-slate-300">No suspect profile data found yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSuspects.map((suspect, index) => (
            <article
              key={`${suspect.name}-${index}`}
              className="rounded-lg border border-slate-700 bg-slate-800/70 p-4"
              style={getScoreCardStyle(suspect.suspicionScore)}
            >
              {/* Render a unique suspect portrait while keeping initials as fallback. */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-dashed border-emerald-400/40 bg-slate-900/70">
                <img
                  src={getSuspectImageUrl(suspect.name)}
                  alt={`${suspect.name} profile`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                    const fallback = event.currentTarget.nextElementSibling
                    if (fallback) fallback.classList.remove('hidden')
                  }}
                />
                <span className="hidden absolute inset-0 flex items-center justify-center text-2xl font-semibold tracking-wider text-emerald-300">
                  {getInitials(suspect.name)}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-amber-200">{suspect.name}</p>
              <div
                className="mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1"
                style={getScoreBadgeStyle(suspect.suspicionScore)}
              >
                {/* Show weighted suspicion score computed from cross-form signals. */}
                <span className="text-xs uppercase tracking-wider">Suspicion Score</span>
                <span className="text-sm font-semibold">{suspect.suspicionScore ?? 0}</span>
              </div>
              {/* Keep signal counters visible for quick score interpretation. */}
              <p className="mt-1 text-xs text-slate-400">Signals: {suspect.signalSummary}</p>
              <p className="mt-1 text-xs text-slate-400">Last Seen: {suspect.timestamp}</p>
              <p className="mt-2 text-sm text-slate-300">{suspect.note}</p>
              <p className="mt-2 text-xs text-emerald-300">Source: {suspect.source}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Suspects

