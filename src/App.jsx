import Dashboard from './pages/Dashboard'
import Sightings from './pages/Sightings'
import Suspects from './pages/Suspects'
import Tips from './pages/Tips'
import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'

// Render top-level routes for dashboard and suspects pages.
function App() {
  const [searchTerm, setSearchTerm] = useState('')

  const getNavClass = ({ isActive }) =>
    `rounded-md border px-3 py-1 text-sm transition ${
      isActive
        ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
    }`

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-amber-300">
          Podo Search: Izmir Mystery
        </h1>

        <nav className="mb-6 flex items-center gap-3">
          <NavLink to="/dashboard" className={getNavClass}>
            Dashboard
          </NavLink>
          <NavLink to="/sightings" className={getNavClass}>
            Sightings
          </NavLink>
          <NavLink to="/suspects" className={getNavClass}>
            Suspects
          </NavLink>
          <NavLink to="/tips" className={getNavClass}>
            Tips
          </NavLink>
        </nav>

        <div className="mb-6">
          {/* Keep one global search input shared by all pages. */}
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Global search: name, location, note, tip..."
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-amber-300/60"
          />
        </div>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard searchTerm={searchTerm} />} />
          <Route path="/sightings" element={<Sightings searchTerm={searchTerm} />} />
          <Route path="/suspects" element={<Suspects searchTerm={searchTerm} />} />
          <Route path="/tips" element={<Tips searchTerm={searchTerm} />} />
        </Routes>
      </div>
    </main>
  )
}

export default App
