const placeholderSlots = [1, 2, 3, 4, 5, 6]

// Show empty suspect photo slots for upcoming content.
function Suspects() {
  return (
    <section className="rounded-xl border border-amber-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <div className="mb-5 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-amber-300">Suspects</h2>
        <p className="mt-2 text-sm text-slate-400">
          Placeholder area for suspect photos and profiles.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placeholderSlots.map((slot) => (
          <article
            key={slot}
            className="rounded-lg border border-slate-700 bg-slate-800/70 p-4"
          >
            {/* Keep an empty image frame for future suspect photos. */}
            <div className="aspect-[4/3] w-full rounded-md border border-dashed border-emerald-400/40 bg-slate-900/70" />
            <p className="mt-3 text-sm font-medium text-amber-200">Suspect Slot {slot}</p>
            <p className="mt-1 text-xs text-slate-400">Photo will be added here.</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Suspects

