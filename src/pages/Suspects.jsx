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

// Render suspect cards sourced from real Jotform forms.
function Suspects() {
  const [suspects, setSuspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch suspect-related records from Messages and Personal Notes.
    const loadSuspects = async () => {
      try {
        const [messageAnswers, noteAnswers] = await Promise.all([
          getSubmissions(FORM_IDS.MESSAGES),
          getSubmissions(FORM_IDS.PERSONAL_NOTES),
        ])

        const messageProfiles = messageAnswers.map((answers) =>
          mapToSuspectProfile(answers, 'messages'),
        )
        const noteProfiles = noteAnswers.map((answers) => mapToSuspectProfile(answers, 'notes'))

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
        const normalizedSuspects = Array.from(merged.values()).map((item) => ({
          ...item,
          source: Array.from(item.sources).join(' + '),
        }))

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

      {sortedSuspects.length === 0 ? (
        <p className="text-slate-300">No suspect profile data found yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSuspects.map((suspect, index) => (
            <article
              key={`${suspect.name}-${index}`}
              className="rounded-lg border border-slate-700 bg-slate-800/70 p-4"
            >
              {/* Keep a photo placeholder until real suspect images are available. */}
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-emerald-400/40 bg-slate-900/70">
                <span className="text-2xl font-semibold tracking-wider text-emerald-300">
                  {getInitials(suspect.name)}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-amber-200">{suspect.name}</p>
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

